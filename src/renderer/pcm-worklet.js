// AudioWorklet：把麦克风/系统声音的 Float32 采样转成 16-bit PCM，
// 累积到约 100ms 再 postMessage，降低消息频率。
class PCMWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = [];
    this._count = 0;
    // sampleRate 是 AudioWorkletGlobalScope 的全局变量
    this._target = Math.max(1024, Math.floor(sampleRate * 0.1));
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const ch = input[0]; // Float32Array, 通常 128 个采样
      this._buf.push(ch.slice());
      this._count += ch.length;

      if (this._count >= this._target) {
        const merged = new Int16Array(this._count);
        let o = 0;
        for (const frame of this._buf) {
          for (let i = 0; i < frame.length; i++) {
            let s = frame[i];
            if (s > 1) s = 1;
            else if (s < -1) s = -1;
            merged[o++] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
        }
        this._buf = [];
        this._count = 0;
        this.port.postMessage(merged.buffer, [merged.buffer]);
      }
    }
    return true;
  }
}

registerProcessor('pcm-worklet', PCMWorklet);
