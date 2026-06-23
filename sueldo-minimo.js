(function(){
  const DEFAULT_SUELDO_MINIMO=539000;
  let historialSueldosMinimos=[];

  function periodoActual(){
    return document.getElementById('periodo')?.value||new Date().toISOString().slice(0,7);
  }

  function ordenar(items){
    return [...items].sort((a,b)=>String(b.vigente_desde).localeCompare(String(a.vigente_desde)));
  }

  function minimoVigente(periodo=periodoActual()){
    const limite=`${periodo}-01`;
    return Number(historialSueldosMinimos.find(item=>item.vigente_desde<=limite)?.monto)||DEFAULT_SUELDO_MINIMO;
  }

  function actualizarReferencia(){
    const monto=minimoVigente();
    const tabla=document.querySelector('#tab-indicadores .ind-table');
    if(tabla?.rows[3]?.cells[1])tabla.rows[3].cells[1].textContent=fmt(monto);
    const campo=document.getElementById('a-sueldo');
    const etiqueta=campo?.closest('.form-group')?.querySelector('label');
    if(campo)campo.min='1';
    if(etiqueta)etiqueta.textContent=`Sueldo Base (referencia minima: ${fmt(monto)})`;
    const vigente=document.getElementById('sm-vigente');
    if(vigente)vigente.innerHTML=`<strong>Vigente para ${nomMes(periodoActual())}:</strong> ${fmt(monto)}.`;
  }

  function montarPanel(){
    const tab=document.getElementById('tab-indicadores');
    if(!tab||document.getElementById('panel-sueldo-minimo'))return;
    const panel=document.createElement('div');
    panel.id='panel-sueldo-minimo';
    panel.className='card';
    panel.innerHTML=`
      <div class="card-title">Historial de sueldo minimo</div>
      <p style="font-size:.8rem;color:var(--muted);line-height:1.55;margin-bottom:12px">Registra cada monto con su mes de vigencia. La liquidacion usa el ultimo valor vigente para el periodo elegido.</p>
      <div class="form-row">
        <div class="form-group"><label>Vigente desde</label><input type="month" id="sm-vigencia"></div>
        <div class="form-group"><label>Monto mensual</label><input type="number" id="sm-monto" min="1" placeholder="Ej: 539000"></div>
      </div>
      <div style="display:flex;justify-content:flex-end"><button class="btn btn-success" onclick="guardarSueldoMinimo()">Guardar vigencia</button></div>
      <div class="callout blue" id="sm-vigente" style="margin-top:14px">Cargando sueldo minimo vigente...</div>
      <div id="lista-sueldos-minimos" style="margin-top:10px"></div>`;
    const primerIndicador=tab.querySelector('.card');
    tab.insertBefore(panel,primerIndicador||null);
    setv('sm-vigencia',periodoActual());
  }

  function guardarCache(){
    const uid=_currentUser?.id||'local';
    localStorage.setItem(`sueldos_minimos_${uid}`,JSON.stringify(historialSueldosMinimos));
  }

  function renderHistorial(){
    const lista=document.getElementById('lista-sueldos-minimos');
    if(!lista)return;
    if(!historialSueldosMinimos.length){
      lista.innerHTML='<div class="empty"><span class="ic">$</span>Sin vigencias registradas. Se usa el valor base anterior hasta guardar la primera.</div>';
      actualizarReferencia();
      return;
    }
    lista.innerHTML=historialSueldosMinimos.map(item=>`
      <div class="hist-item">
        <div><div class="hist-mes">${nomMes(String(item.vigente_desde).slice(0,7))}</div><div style="font-size:.74rem;color:var(--muted)">Sueldo minimo mensual vigente</div></div>
        <div style="display:flex;align-items:center;gap:9px"><div class="hist-net">${fmt(item.monto)}</div><button class="btn-danger-sm" onclick="eliminarSueldoMinimo('${item.id}')">x</button></div>
      </div>`).join('');
    actualizarReferencia();
  }

  async function cargarSueldosMinimos(){
    montarPanel();
    const uid=_currentUser?.id;
    if(!uid){historialSueldosMinimos=[];renderHistorial();return;}
    const cacheKey=`sueldos_minimos_${uid}`;
    try{
      const response=await fetch(`${SURL}/rest/v1/sueldos_minimos?user_id=eq.${encodeURIComponent(uid)}&order=vigente_desde.desc`,{headers:H()});
      if(!response.ok)throw new Error(await response.text());
      historialSueldosMinimos=ordenar(await response.json());
      localStorage.setItem(cacheKey,JSON.stringify(historialSueldosMinimos));
    }catch(error){
      historialSueldosMinimos=ordenar(JSON.parse(localStorage.getItem(cacheKey)||'[]'));
    }
    renderHistorial();
    calcular();
  }

  window.guardarSueldoMinimo=async function(){
    const periodo=document.getElementById('sm-vigencia')?.value;
    const monto=Number(document.getElementById('sm-monto')?.value);
    const uid=_currentUser?.id;
    if(!periodo||!monto||monto<=0){toast('Ingresa mes de vigencia y monto valido','err');return;}
    if(!uid){toast('Debes iniciar sesion para guardar','err');return;}
    const registro={user_id:uid,vigente_desde:`${periodo}-01`,monto};
    try{
      const response=await fetch(`${SURL}/rest/v1/sueldos_minimos?on_conflict=user_id,vigente_desde`,{method:'POST',headers:{...H(),Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(registro)});
      if(!response.ok)throw new Error(await response.text());
      const guardado=(await response.json())[0];
      historialSueldosMinimos=ordenar([...historialSueldosMinimos.filter(item=>item.vigente_desde!==registro.vigente_desde),guardado]);
      toast('Vigencia guardada');
    }catch(error){
      const local={...registro,id:`local_${Date.now()}`};
      historialSueldosMinimos=ordenar([...historialSueldosMinimos.filter(item=>item.vigente_desde!==registro.vigente_desde),local]);
      toast('Guardado localmente. Ejecuta la migracion de Supabase.','err');
    }
    guardarCache();
    document.getElementById('sm-monto').value='';
    renderHistorial();
    calcular();
  };

  window.eliminarSueldoMinimo=async function(id){
    const item=historialSueldosMinimos.find(row=>row.id===id);
    if(!item||!confirm(`Eliminar la vigencia de ${nomMes(String(item.vigente_desde).slice(0,7))}?`))return;
    try{
      if(!String(id).startsWith('local_')){
        const response=await fetch(`${SURL}/rest/v1/sueldos_minimos?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:H()});
        if(!response.ok)throw new Error(await response.text());
      }
      historialSueldosMinimos=historialSueldosMinimos.filter(row=>row.id!==id);
      guardarCache();
      renderHistorial();
      calcular();
    }catch(error){toast('No se pudo eliminar la vigencia','err');}
  };

  function recalcularConMinimo(d){
    if(!d)return d;
    const minimo=minimoVigente(d.periodo);
    d.sueldoMinimo=minimo;
    d.minimoImponibleProporcional=Math.round(minimo*d.factor);
    d.rentaImponible=Math.max(d.baseImponibleBruta,d.minimoImponibleProporcional);
    d.descAfp=pct(d.rentaImponible,d.afpTasa);
    d.descSalud=pct(d.rentaImponible,7);
    d.totalDescuentos=d.descAfp+d.descSalud+d.descAdicional;
    d.liquido=d.totalHaberes-d.totalDescuentos;
    d.costoSIS=pct(d.rentaImponible,1.54);
    d.costoSS=pct(d.rentaImponible,0.9);
    d.costoAcc=pct(d.rentaImponible,0.93);
    d.costoAfpAd=pct(d.rentaImponible,0.1);
    d.costoCes=pct(d.rentaImponible,3);
    d.totalEmp=d.totalHaberes+d.costoSIS+d.costoSS+d.costoAcc+d.costoAfpAd+d.costoCes;
    return d;
  }

  const renderLiqBase=renderLiq;
  window.renderLiq=function(d){
    const resultado=renderLiqBase(recalcularConMinimo(d));
    actualizarReferencia();
    return resultado;
  };

  const nuevaAsesoraBase=nuevaAsesora;
  window.nuevaAsesora=function(){
    nuevaAsesoraBase();
    const tabla=document.querySelector('#tab-indicadores .ind-table');
    if(tabla?.rows[3]?.cells[1])tabla.rows[3].cells[1].textContent=fmt(monto);
    const campo=document.getElementById('a-sueldo');
    if(campo&&(!campo.value||Number(campo.value)===DEFAULT_SUELDO_MINIMO))campo.value=minimoVigente();
    actualizarReferencia();
  };

  const mostrarAppBase=mostrarApp;
  window.mostrarApp=function(){
    const resultado=mostrarAppBase();
    cargarSueldosMinimos();
    return resultado;
  };

  function iniciar(){
    montarPanel();
    if(_currentUser)cargarSueldosMinimos();else renderHistorial();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
