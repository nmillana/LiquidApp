(function(){
  const LOGO_URL='./Logo_Cuentas_Claras.png';

  function addBrandStyles(){
    const style=document.createElement('style');
    style.textContent=`
      .brand-mark{display:block;object-fit:contain;background:#fff;border-radius:14px}
      .auth-logo .brand-mark{width:78px;height:78px;margin:0 auto 12px;box-shadow:0 6px 18px rgba(15,23,42,.12)}
      .portal-brand{width:34px;height:34px;border-radius:9px;object-fit:contain;background:#fff;padding:2px;box-shadow:0 2px 8px rgba(0,0,0,.18)}
      .app-header h1{gap:9px}
      @media(max-width:640px){.auth-logo .brand-mark{width:68px;height:68px}.portal-brand{width:30px;height:30px}}
    `;
    document.head.appendChild(style);
  }

  function setFavicon(){
    document.querySelectorAll('link[rel~="icon"]').forEach(link=>link.remove());
    const icon=document.createElement('link');
    icon.rel='icon';
    icon.type='image/png';
    icon.href=LOGO_URL;
    document.head.appendChild(icon);

    const apple=document.createElement('link');
    apple.rel='apple-touch-icon';
    apple.href=LOGO_URL;
    document.head.appendChild(apple);
  }

  function setAuthBrand(){
    document.querySelectorAll('.auth-logo .ic').forEach(icon=>{
      const image=document.createElement('img');
      image.className='brand-mark';
      image.src=LOGO_URL;
      image.alt='LiquidApp';
      icon.replaceWith(image);
    });
  }

  function setPortalBrand(){
    const title=document.querySelector('.app-header h1');
    if(!title||title.dataset.brandReady==='true')return;
    title.dataset.brandReady='true';
    title.innerHTML=`<img class="portal-brand" src="${LOGO_URL}" alt="LiquidApp">LiquidApp <span style="font-weight:500;opacity:.82">Casa Particular</span>`;
  }

  function applyBrand(){
    addBrandStyles();
    setFavicon();
    setAuthBrand();
    setPortalBrand();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyBrand);
  else applyBrand();
})();
