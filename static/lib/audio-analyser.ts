/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class Analyser {
  public analyser: AnalyserNode;
  public data: Uint8Array;

  constructor(node: AudioNode) {
    this.analyser = node.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    node.connect(this.analyser);
  }

  update() {
    this.analyser.getByteFrequencyData(this.data);
  }
}
