// Deepgram 实时转写客户端：使用浏览器原生 WebSocket，
// 通过子协议 ['token', apiKey] 鉴权（浏览器无法设置请求头）。
class DeepgramLive {
  /**
   * @param {object} opts
   * @param {string} opts.apiKey
   * @param {string} opts.language  zh / en-US / multi
   * @param {number} opts.sampleRate
   * @param {function} opts.onTranscript  ({text, isFinal}) => void
   * @param {function} [opts.onState]      (state, info) => void
   */
  constructor(opts) {
    this.apiKey = opts.apiKey;
    this.language = opts.language || 'zh';
    this.sampleRate = opts.sampleRate || 16000;
    this.onTranscript = opts.onTranscript || (() => {});
    this.onState = opts.onState || (() => {});
    this.ws = null;
    this.keepAlive = null;
    this.closedByUser = false;
  }

  connect() {
    const multi = this.language === 'multi';
    const params = new URLSearchParams({
      model: multi ? 'nova-3' : 'nova-2',
      smart_format: 'true',
      interim_results: 'true',
      encoding: 'linear16',
      sample_rate: String(this.sampleRate),
      channels: '1',
      endpointing: '300',
    });
    if (multi) params.set('language', 'multi');
    else params.set('language', this.language);

    const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
    this.closedByUser = false;

    try {
      this.ws = new WebSocket(url, ['token', this.apiKey]);
    } catch (e) {
      this.onState('error', e.message);
      return;
    }
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this.onState('open');
      this.keepAlive = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
        }
      }, 8000);
    };

    this.ws.onmessage = (evt) => {
      let data;
      try {
        data = JSON.parse(evt.data);
      } catch (_e) {
        return;
      }
      if (data.type === 'Results') {
        const alt = data.channel && data.channel.alternatives && data.channel.alternatives[0];
        const text = alt ? alt.transcript : '';
        if (text && text.trim()) {
          this.onTranscript({ text: text.trim(), isFinal: !!data.is_final });
        }
      } else if (data.type === 'Error') {
        this.onState('error', data.description || data.message || 'Deepgram 错误');
      }
    };

    this.ws.onerror = () => {
      this.onState('error', 'WebSocket 连接错误（请检查 Deepgram API Key / 网络）');
    };

    this.ws.onclose = (evt) => {
      clearInterval(this.keepAlive);
      this.keepAlive = null;
      this.onState('closed', this.closedByUser ? '' : `连接关闭(${evt.code})`);
    };
  }

  send(buffer) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(buffer);
    }
  }

  close() {
    this.closedByUser = true;
    clearInterval(this.keepAlive);
    this.keepAlive = null;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'CloseStream' }));
      } catch (_e) {
        /* ignore */
      }
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_e) {
        /* ignore */
      }
    }
    this.ws = null;
  }
}

window.DeepgramLive = DeepgramLive;
