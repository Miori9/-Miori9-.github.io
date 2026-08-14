const OCGalleryApp = {
  launch() {
    const content = document.createElement('div');
    content.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 16px;
      color: #444;
      text-align: center;
      line-height: 2;
    `;

    // Zalgo placeholder text
    const zalgoChars = ['̀','́','̂','̃','̄','̅','̆','̇','̈','̋','̌'];
    const text = '暂未实现';
    let zalgo = '';
    for (const ch of text) {
      zalgo += ch;
      for (let i = 0; i < 3; i++) {
        zalgo += zalgoChars[Math.floor(Math.random() * zalgoChars.length)];
      }
    }

    content.textContent = zalgo;

    WindowManager.create('oc-gallery', 'OC Gallery', content, {
      width: 400,
      height: 350,
    });
  },

  onClose() {},
};

window.Apps = window.Apps || {};
window.Apps['oc-gallery'] = OCGalleryApp;
