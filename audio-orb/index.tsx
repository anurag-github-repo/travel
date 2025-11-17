/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, LiveServerMessage, Modality, Session} from '@google/genai';
import {LitElement, css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {createBlob, decode, decodeAudioData} from './utils';
import './visual-3d';

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = '';
  @state() error = '';
  @state() conversationLog: {speaker: 'You' | 'AI'; text: string}[] = [];
  @state() currentUserTranscription = '';
  @state() currentAiTranscription = '';

  private client: GoogleGenAI;
  // Fix: Use a promise to manage the session and avoid race conditions.
  private sessionPromise: Promise<Session>;
  // Fix: Correctly type `window.webkitAudioContext` for Safari compatibility.
  private inputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 16000});
  // Fix: Correctly type `window.webkitAudioContext` for Safari compatibility.
  private outputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 24000});
  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream;
  private sourceNode: AudioBufferSourceNode;
  private scriptProcessorNode: ScriptProcessorNode;
  private sources = new Set<AudioBufferSourceNode>();
  // Fix: Add `shadowRoot` property declaration to satisfy TypeScript compiler for LitElement.
  readonly shadowRoot!: ShadowRoot;

  static styles = css`
    #status {
      position: absolute;
      bottom: 5vh;
      left: 0;
      right: 0;
      z-index: 10;
      text-align: center;
    }

    #transcription-container {
      position: absolute;
      bottom: 25vh;
      left: 50%;
      transform: translateX(-50%);
      width: 80vw;
      max-width: 600px;
      max-height: 40vh;
      overflow-y: auto;
      color: white;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 12px;
      padding: 1em;
      font-family: monospace;
      font-size: 16px;
      text-align: left;
      white-space: pre-wrap;
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: 0.5em;
    }

    .entry {
      line-height: 1.4;
    }

    .entry b {
      font-weight: bold;
      margin-right: 0.5em;
      color: #a5c9ff; /* Blue for 'You' */
    }

    .entry.ai b {
      color: #a5ffc9; /* Green for 'AI' */
    }

    .entry.current {
      opacity: 0.7;
    }

    .controls {
      z-index: 10;
      position: absolute;
      bottom: 10vh;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 10px;

      button {
        outline: none;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        width: 64px;
        height: 64px;
        cursor: pointer;
        font-size: 24px;
        padding: 0;
        margin: 0;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }

      button[disabled] {
        display: none;
      }
    }
  `;

  constructor() {
    super();
    this.initClient();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (
      changedProperties.has('conversationLog') ||
      changedProperties.has('currentUserTranscription') ||
      changedProperties.has('currentAiTranscription')
    ) {
      const container = this.shadowRoot?.querySelector(
        '#transcription-container',
      );
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }

  private initAudio() {
    this.nextStartTime = this.outputAudioContext.currentTime;
  }

  private initClient() {
    this.initAudio();

    // Fix: Use process.env.API_KEY as per the coding guidelines.
    this.client = new GoogleGenAI({
      apiKey: process.env.API_KEY,
    });

    this.outputNode.connect(this.outputAudioContext.destination);

    this.initSession();
  }

  private initSession() {
    const model = 'gemini-2.5-flash-native-audio-preview-09-2025';

    try {
      // Fix: Assign promise to sessionPromise to handle connection state correctly.
      this.sessionPromise = this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            this.updateStatus('Opened');
          },
          onmessage: async (message: LiveServerMessage) => {
            const audio =
              message.serverContent?.modelTurn?.parts[0]?.inlineData;

            if (audio) {
              this.nextStartTime = Math.max(
                this.nextStartTime,
                this.outputAudioContext.currentTime,
              );

              const audioBuffer = await decodeAudioData(
                decode(audio.data),
                this.outputAudioContext,
                24000,
                1,
              );
              const source = this.outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(this.outputNode);
              source.addEventListener('ended', () => {
                this.sources.delete(source);
              });

              source.start(this.nextStartTime);
              this.nextStartTime = this.nextStartTime + audioBuffer.duration;
              this.sources.add(source);
            }

            if (message.serverContent?.inputTranscription) {
              this.currentUserTranscription +=
                message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.outputTranscription) {
              this.currentAiTranscription +=
                message.serverContent.outputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const newLog = [...this.conversationLog];
              if (this.currentUserTranscription.trim()) {
                newLog.push({
                  speaker: 'You',
                  text: this.currentUserTranscription.trim(),
                });
              }
              if (this.currentAiTranscription.trim()) {
                newLog.push({
                  speaker: 'AI',
                  text: this.currentAiTranscription.trim(),
                });
              }
              this.conversationLog = newLog;

              this.currentUserTranscription = '';
              this.currentAiTranscription = '';
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of this.sources.values()) {
                source.stop();
                this.sources.delete(source);
              }
              this.nextStartTime = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            this.updateError(e.message);
          },
          onclose: (e: CloseEvent) => {
            this.updateStatus('Close:' + e.reason);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            // Fix: Use a supported voice name. 'Orus' is not supported.
            voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Zephyr'}},
            // languageCode: 'en-GB'
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });
      this.sessionPromise.catch((e) => {
        console.error(e);
        this.updateError((e as Error).message);
      });
    } catch (e) {
      console.error(e);
    }
  }

  private updateStatus(msg: string) {
    this.status = msg;
  }

  private updateError(msg: string) {
    this.error = msg;
  }

  private async startRecording() {
    if (this.isRecording) {
      return;
    }

    this.inputAudioContext.resume();

    this.updateStatus('Requesting microphone access...');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.updateStatus('Microphone access granted. Starting capture...');

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(
        this.mediaStream,
      );
      this.sourceNode.connect(this.inputNode);

      const bufferSize = 4096;
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(
        bufferSize,
        1,
        1,
      );

      this.scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        if (!this.isRecording) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);

        // Fix: Use sessionPromise to ensure the session is active before sending data.
        this.sessionPromise.then((session) => {
          session.sendRealtimeInput({media: createBlob(pcmData)});
        });
      };

      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.inputAudioContext.destination);

      this.isRecording = true;
      this.updateStatus('🔴 Recording... Capturing PCM chunks.');
    } catch (err) {
      console.error('Error starting recording:', err);
      this.updateStatus(`Error: ${err.message}`);
      this.stopRecording();
    }
  }

  private stopRecording() {
    if (!this.isRecording && !this.mediaStream && !this.inputAudioContext)
      return;

    this.updateStatus('Stopping recording...');

    this.isRecording = false;

    if (this.scriptProcessorNode && this.sourceNode && this.inputAudioContext) {
      this.scriptProcessorNode.disconnect();
      this.sourceNode.disconnect();
    }

    this.scriptProcessorNode = null;
    this.sourceNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.updateStatus('Recording stopped. Click Start to begin again.');
  }

  private reset() {
    // Fix: Use sessionPromise to correctly close the session.
    this.sessionPromise?.then((session) => session.close());
    this.initSession();
    this.updateStatus('Session cleared.');
    this.conversationLog = [];
    this.currentUserTranscription = '';
    this.currentAiTranscription = '';
  }

  render() {
    return html`
      <div>
        ${this.conversationLog.length > 0 ||
        this.currentUserTranscription ||
        this.currentAiTranscription
          ? html`
              <div id="transcription-container">
                ${this.conversationLog.map(
                  (entry) =>
                    html`<div class="entry ${entry.speaker.toLowerCase()}">
                      <b>${entry.speaker}:</b> ${entry.text}
                    </div>`,
                )}
                ${this.currentUserTranscription
                  ? html`<div class="entry you current">
                      <b>You:</b> ${this.currentUserTranscription}
                    </div>`
                  : ''}
                ${this.currentAiTranscription
                  ? html`<div class="entry ai current">
                      <b>AI:</b> ${this.currentAiTranscription}
                    </div>`
                  : ''}
              </div>
            `
          : ''}
        <div class="controls">
          <button
            id="resetButton"
            @click=${this.reset}
            ?disabled=${this.isRecording}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="40px"
              viewBox="0 -960 960 960"
              width="40px"
              fill="#ffffff">
              <path
                d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
            </svg>
          </button>
          <button
            id="startButton"
            @click=${this.startRecording}
            ?disabled=${this.isRecording}>
            <svg
              viewBox="0 0 100 100"
              width="32px"
              height="32px"
              fill="#c80000"
              xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="50" />
            </svg>
          </button>
          <button
            id="stopButton"
            @click=${this.stopRecording}
            ?disabled=${!this.isRecording}>
            <svg
              viewBox="0 0 100 100"
              width="32px"
              height="32px"
              fill="#000000"
              xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="100" height="100" rx="15" />
            </svg>
          </button>
        </div>

        <div id="status"> ${this.error} </div>
        <gdm-live-audio-visuals-3d
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}></gdm-live-audio-visuals-3d>
      </div>
    `;
  }
}
