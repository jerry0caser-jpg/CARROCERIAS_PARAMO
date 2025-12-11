// app.js
const STORAGE_STATE_KEY = "paramo_materiales_state_v3c";
const LOGO_KEY = "paramo_logo_dataurl";
const BRAND_KEY = "paramo_brand_name";

let BODY_TYPES = ["Caja seca","Caja refrigerada","Plataforma","Redillas","Caja frutera"];
const COMMON_VARIANTS = [
  "Térmico","Sistema de enfriamiento","Volado sobre cabina","Cuadrada","Aerodinámico",
  "Riel logístico","Puerta lateral","Cortina plástica","Techo translúcido","Doble piso",
  "Porta-escalera","Defensas laterales"
];
const EMPTY_ROW = { producto:"", medidas:"", unidad:"", calibre:"", cantidad:1, notas:"" };

const state = {
  brand: "Carrocerías PÁRAMO",
  brandLogoDataUrl: "",
  brandLogoDims: null,
  activeProducts: ["Caja seca"], // si está vacío => modo libre
  productVariants: { "Caja seca": [] },
  rows: [],
  selectedIdx: new Set(),
  dimensiones: { largo:"", ancho:"", alto:"", unidad:"" },
  cliente: "",
  observaciones: "",
  libre: { ...EMPTY_ROW }
};

const $ = s => document.querySelector(s);
function el(tag, attrs={}, children=[]){
  const e=document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k==="class") e.className=v;
    else if(k==="onclick") e.addEventListener("click",v);
    else if(k==="oninput") e.addEventListener("input",v);
    else if(k==="onchange") e.addEventListener("change",v);
    else e.setAttribute(k,v);
  });
  (Array.isArray(children)?children:[children]).forEach(c=>{
    if(c==null) return;
    if(c instanceof Node) e.appendChild(c);
    else e.appendChild(document.createTextNode(String(c)));
  });
  return e;
}
const toNumber = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* Persistencia */
function saveState(){
  try{
    const payload={ ...state, selectedIdx:[...state.selectedIdx] };
    localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(payload));
    if(state.brandLogoDataUrl) localStorage.setItem(LOGO_KEY,state.brandLogoDataUrl);
    if(state.brand) localStorage.setItem(BRAND_KEY,state.brand);
  }catch(e){}
}
function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_STATE_KEY);
    if(raw){
      const data=JSON.parse(raw);
      Object.assign(state,data);
      state.selectedIdx = new Set(data.selectedIdx||[]);
    }else{
      const logo=localStorage.getItem(LOGO_KEY);
      const brand=localStorage.getItem(BRAND_KEY);
      if(logo) state.brandLogoDataUrl=logo;
      if(brand) state.brand=brand;
    }
  }catch(e){}
}

/* Inicio */
document.addEventListener("DOMContentLoaded",()=>{
  loadState();
  initSelectors();
  initVariantAutocomplete();
  initInputs();
  initButtons();
  bindLibre();
  renderBodyTypeDatalist();
  renderChips();
  renderVariantChips();
  renderTable();
  renderSummary();
  if(state.brandLogoDataUrl) setLogoPreview(state.brandLogoDataUrl);
  saveState();
});

/* Datalist para tipos */
function renderBodyTypeDatalist(){
  const dl=$("#dlBodyTypes");
  dl.innerHTML="";
  BODY_TYPES.forEach(t=> dl.appendChild(el("option",{value:t},t)));
}

/* Selectores */
function initSelectors(){
  const selBody=$("#selBodyType");
  rebuildBodySelect(selBody);
  selBody.addEventListener("change", e=>{
    const v=e.target.value;
    if(v===""){
      state.activeProducts=[];
      renderChips(); saveState(); return;
    }
    state.activeProducts=[v];
    if(!state.productVariants[v]) state.productVariants[v]=[];
    renderChips(); renderVariantChips(); saveState();
  });
}
function rebuildBodySelect(selEl = $("#selBodyType")){
  selEl.innerHTML="";
  const placeholder = el("option",{value:""}, "Selecciona un tipo (libre)");
  if(!(state.activeProducts && state.activeProducts.length)) placeholder.selected = true;
  selEl.appendChild(placeholder);
  BODY_TYPES.forEach(t=>{
    const isActive = state.activeProducts && state.activeProducts[0] === t;
    selEl.appendChild(el("option",{value:t, selected:isActive}, t));
  });
  const active = state.activeProducts && state.activeProducts[0];
  if(active && !BODY_TYPES.includes(active)){
    BODY_TYPES = [...BODY_TYPES, active];
    renderBodyTypeDatalist();
    rebuildBodySelect(selEl);
  }
}

/* Autocomplete variantes */
function initVariantAutocomplete(){
  const dl=$("#dlVariants");
  dl.innerHTML="";
  COMMON_VARIANTS.forEach(v=> dl.appendChild(el("option",{value:v},v)));
}

/* Inputs generales */
function initInputs(){
  $("#inpEmpresa").value=state.brand||"";
  $("#inpEmpresa").addEventListener("input", e=>{ state.brand=e.target.value; saveState(); });

  $("#inpLogo").addEventListener("change", e=>{
    const file=e.target.files&&e.target.files[0];
    if(!file) return;
    const rd=new FileReader();
    rd.onload=()=>{ setLogoPreview(rd.result); saveState(); };
    rd.readAsDataURL(file);
  });

  $("#inpCliente").value=state.cliente||"";
  $("#inpCliente").addEventListener("input", e=>{ state.cliente=e.target.value; saveState(); });

  $("#inpLargo").value=state.dimensiones.largo||"";
  $("#inpAncho").value=state.dimensiones.ancho||"";
  $("#inpAlto").value=state.dimensiones.alto||"";
  $("#inpDimUnit").value=state.dimensiones.unidad||"";
  ["#inpLargo","#inpAncho","#inpAlto"].forEach((id,ix)=>
    $(id).addEventListener("input", e=>{
      const k=["largo","ancho","alto"][ix];
      state.dimensiones[k]=e.target.value; saveState();
    })
  );
  $("#inpDimUnit").addEventListener("input", e=>{ state.dimensiones.unidad=e.target.value; saveState(); });

  $("#txtObs").value=state.observaciones||"";
  $("#txtObs").addEventListener("input", e=>{ state.observaciones=e.target.value; saveState(); });
}

/* Logo preview y dimensiones */
function setLogoPreview(dataUrl){
  state.brandLogoDataUrl=dataUrl;
  const img=$("#brandLogo");
  const prev=$("#logoPreview");
  img.src=dataUrl;
  prev.src=dataUrl;
  prev.style.display="block";
  const probe=new Image();
  probe.onload=()=>{
    state.brandLogoDims={ w:probe.naturalWidth, h:probe.naturalHeight };
    saveState();
  };
  probe.src=dataUrl;
}

/* Botones */
function initButtons(){
  $("#btnExportPDF").addEventListener("click", exportPDF);

  $("#btnAddCustomBody").addEventListener("click", ()=>{
    const v=($("#inpCustomBody").value||"").trim();
    if(!v) return;
    if(!BODY_TYPES.includes(v)) BODY_TYPES=[...BODY_TYPES, v];
    state.activeProducts=[v];
    if(!state.productVariants[v]) state.productVariants[v]=[];
    $("#inpCustomBody").value="";
    renderBodyTypeDatalist();
    rebuildBodySelect();
    renderChips(); renderVariantChips(); saveState();
  });

  $("#btnAddVariant").addEventListener("click", ()=>{
    const v=($("#inpAddVariant").value||"").trim();
    if(!v) return;
    const prod = state.activeProducts[0] || "Libre";
    if(!state.productVariants[prod]) state.productVariants[prod]=[];
    if(!state.productVariants[prod].includes(v)) state.productVariants[prod].push(v);
    $("#inpAddVariant").value="";
    renderVariantChips(); saveState();
  });

  $("#btnSelectAll").addEventListener("click", ()=>{
    state.selectedIdx=new Set(state.rows.map((_,i)=>i));
    renderTable(); renderSummary();
  });
  $("#btnClearSel").addEventListener("click", ()=>{
    state.selectedIdx.clear();
    renderTable(); renderSummary();
  });
  $("#btnDeleteSel").addEventListener("click", ()=>{
    state.rows=state.rows.filter((_,i)=> !state.selectedIdx.has(i));
    state.selectedIdx.clear();
    renderTable(); renderSummary(); saveState();
  });
}

/* Chips */
function renderChips(){
  const wrap=$("#chipsActive");
  wrap.innerHTML="";
  if(!(state.activeProducts && state.activeProducts.length)) return;
  state.activeProducts.forEach((p,idx)=>{
    const chip=el("span",{},`${p} `);
    const close=el("a",{href:"#", onclick:(e)=>{
      e.preventDefault();
      state.activeProducts.splice(idx,1);
      rebuildBodySelect();
      renderChips(); renderVariantChips(); saveState();
    }},"✕");
    chip.appendChild(close);
    wrap.appendChild(chip);
  });
}
function renderVariantChips(){
  const wrap=$("#chipsVariants");
  wrap.innerHTML="";
  const prod=state.activeProducts[0] || "Libre";
  const list=state.productVariants[prod]||[];
  list.forEach((v,idx)=>{
    const chip=el("span",{},`${v} `);
    const close=el("a",{href:"#", onclick:(e)=>{
      e.preventDefault();
      list.splice(idx,1);
      renderVariantChips(); saveState();
    }},"✕");
    chip.appendChild(close);
    wrap.appendChild(chip);
  });
}

/* Tabla */
function tableHeaders(){
  return ["Sel.","Producto","Medidas","Unidad","Calibre","Cant.","Notas","Acciones"];
}
function renderTable(){
  const thead=$("#theadListado");
  const tbody=$("#tbodyListado");
  thead.innerHTML=""; tbody.innerHTML="";
  const trh=el("tr");
  tableHeaders().forEach(h=> trh.appendChild(el("th",{},h)));
  thead.appendChild(trh);

  state.rows.forEach((r,i)=>{
    const invalid=!r.producto || !r.unidad || !(Number(r.cantidad)>0);
    const tr=el("tr",{class: invalid?"invalid":""});

    const tdSel=el("td");
    const cb=el("input",{type:"checkbox"});
    cb.checked = state.selectedIdx.has(i);
    cb.addEventListener("change", (e)=>{
      if(e.target.checked) state.selectedIdx.add(i); else state.selectedIdx.delete(i);
      $("#btnDeleteSel").disabled=state.selectedIdx.size===0;
      $("#sumSeleccion").textContent= state.selectedIdx.size ? `· Seleccionadas: ${state.selectedIdx.size}` : "· Sin selección";
    });
    tdSel.appendChild(cb);
    tr.appendChild(tdSel);

    const cellInput=(val,ph,oninput, extraClass="")=>{
      const td=el("td");
      const inp=el("input",{class:`tbl-input ${extraClass}`, value:val||"", placeholder:ph, oninput:(e)=>{
        oninput(e.target.value); saveState();
      }});
      td.appendChild(inp);
      return td;
    };

    tr.appendChild(cellInput(r.producto,"Producto", v=> r.producto=v));
    tr.appendChild(cellInput(r.medidas,"Medidas (ej. 4x8)", v=> r.medidas=v));
    tr.appendChild(cellInput(r.unidad,"Unidad (libre)", v=> r.unidad=v));
    tr.appendChild(cellInput(r.calibre,"Calibre/Espesor", v=> r.calibre=v));

    const tdCant=el("td");
    const minus=el("button",{class:"btn", onclick:()=>{
      r.cantidad=Math.max(0,(Number(r.cantidad)||0)-1); renderTable(); renderSummary(); saveState();
    }},"–");
    const qty=el("input",{class:"tbl-input center", type:"number", min:"0", value:r.cantidad??0, oninput:(e)=>{
      r.cantidad=toNumber(e.target.value); renderSummary(); saveState();
    }});
    const plus=el("button",{class:"btn", onclick:()=>{
      r.cantidad=(Number(r.cantidad)||0)+1; renderTable(); renderSummary(); saveState();
    }},"+");
    tdCant.append(minus,qty,plus);
    tr.appendChild(tdCant);

    tr.appendChild(cellInput(r.notas,"Notas", v=> r.notas=v));

    const tdAct=el("td",{class:"row-actions"});
    const btnDup=el("button",{class:"btn", onclick:()=>{
      state.rows.splice(i+1,0,{...r}); renderTable(); renderSummary(); saveState();
    }},"Duplicar");
    const btnDel=el("button",{class:"btn danger", onclick:()=>{
      state.rows.splice(i,1); state.selectedIdx.delete(i); renderTable(); renderSummary(); saveState();
    }},"Eliminar");
    tdAct.append(btnDup,btnDel);
    tr.appendChild(tdAct);

    tbody.appendChild(tr);
  });

  $("#btnDeleteSel").disabled=state.selectedIdx.size===0;
}
function renderSummary(){
  $("#sumPartidas").textContent=`Partidas: ${state.rows.length}`;
  const suma=state.rows.reduce((s,r)=> s+(Number(r.cantidad)||0),0);
  $("#sumCantidades").textContent=`· Suma cantidades: ${suma}`;
  $("#sumSeleccion").textContent= state.selectedIdx.size? `· Seleccionadas: ${state.selectedIdx.size}` : "· Sin selección";
}

/* Captura rápida */
function bindLibre(){
  const bind=(id,key)=> $(id).addEventListener("input", e=>{ state.libre[key]= e.target.value; });
  bind("#libProd","producto");
  bind("#libMed","medidas");
  bind("#libUni","unidad");
  bind("#libCal","calibre");
  $("#libCant").addEventListener("input", e=> state.libre.cantidad=toNumber(e.target.value));
  bind("#libNotas","notas");

  $("#btnAddLibre").onclick=()=>{
    state.rows.push({...EMPTY_ROW, ...state.libre});
    state.libre={...EMPTY_ROW};
    ["#libProd","#libMed","#libUni","#libCal","#libCant","#libNotas"].forEach(id=> $(id).value="");
    $("#libCant").value=1;
    renderTable(); renderSummary(); saveState();
  };
}

/* ===== Exportar PDF ===== */
function drawLetterhead(doc, margin){
  const pageW=doc.internal.pageSize.getWidth();
  const headerH=70;

  doc.setDrawColor(192,22,26);
  doc.setLineWidth(1);
  doc.roundedRect(margin-6, margin-10, pageW-(margin*2)+12, headerH, 6, 6);

  try{
    if(state.brandLogoDataUrl){
      const maxH=58,maxW=110;
      let w=90,h=58;
      if(state.brandLogoDims){
        const {w:lw,h:lh}=state.brandLogoDims;
        const ratio= lw&&lh ? lw/lh : (w/h);
        h=Math.min(maxH, lh);
        w=h*ratio;
        if(w>maxW){ w=maxW; h=w/ratio; }
      }
      doc.addImage(state.brandLogoDataUrl, "PNG", margin, margin-6, w, h);
    }
  }catch(_){}

  doc.setTextColor(0,0,0);
  doc.setFontSize(16);
  doc.text((state.brand||"CARROCERÍAS PÁRAMO"), margin+120, margin+10);

  doc.setFontSize(10);
  const now=new Date();
  doc.text(`Fecha: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, pageW - margin - 180, margin + 10);
  doc.text("Listado de Materiales", margin + 120, margin + 26);

  return headerH + 10;
}
function computeWidths(doc){
  const pageW=doc.internal.pageSize.getWidth();
  const margin=36;
  const avail=pageW-(margin*2);
  // 6 columnas sin columna vacía
  const ratios=[0.26,0.20,0.12,0.12,0.10,0.20]; // Producto, Medidas, Unidad, Calibre, Cantidad, Notas
  const sum=ratios.reduce((a,b)=>a+b,0);
  return ratios.map(r=> Math.floor(avail*(r/sum)));
}
function exportPDF(){
  const { jsPDF }=window.jspdf;
  const doc=new jsPDF({unit:"pt", format:"a4"});
  const margin=36;
  let y=margin;

  y+=drawLetterhead(doc, margin);

  doc.setFontSize(12);
  const productosTitulo = state.activeProducts.length ? state.activeProducts.join(" / ") : "Libre";
  doc.text(`Producto(s): ${productosTitulo}`, margin, y); y+=14;
  if(state.cliente){ doc.text(`Cliente: ${state.cliente}`, margin, y); y+=14; }

  const {largo,ancho,alto,unidad}=state.dimensiones;
  if(largo||ancho||alto||unidad){
    doc.text(`Dimensiones${unidad?` (${unidad.toUpperCase()})`:""}: L ${largo||"?"}  ·  A ${ancho||"?"}  ·  H ${alto||"?"}`, margin, y);
    y+=14;
  }
  if(state.observaciones){
    const obs=doc.splitTextToSize(`Observaciones: ${state.observaciones}`, doc.internal.pageSize.getWidth()-(margin*2));
    doc.text(obs, margin, y); y+=obs.length*12+6;
  }

  const headers=["Producto","Medidas","Unidad","Calibre","Cantidad","Notas"];
  const widths=computeWidths(doc);
  const lineH=12, vPad=6;

  const drawRow=(cells, opts={})=>{
    const {fill=false, bold=false}=opts;
    const wraps=cells.map((txt,i)=> doc.splitTextToSize(String(txt??""), Math.max(10, widths[i]-6)));
    const maxLines=Math.max(...wraps.map(w=> Math.max(1,w.length)));
    const rowH=Math.max(18,(maxLines*lineH)+vPad*2);
    const bottom=doc.internal.pageSize.getHeight()-margin;
    if(y+rowH>bottom){ doc.addPage(); y=margin+drawLetterhead(doc, margin)+6; }
    let x=margin;
    if(bold) doc.setFont(undefined,"bold");
    for(let i=0;i<cells.length;i++){
      doc.setDrawColor(192,22,26);
      if(fill){
        doc.setFillColor(255,235,235); // encabezado con fondo tenue
        doc.rect(x,y,widths[i],rowH,"FD");
      }else{
        doc.rect(x,y,widths[i],rowH);
      }
      const lines=wraps[i];
      let ty=y+vPad+lineH;
      lines.forEach((ln,idx)=>{ doc.text(String(ln), x+3, ty+(idx*lineH)); });
      x+=widths[i];
    }
    if(bold) doc.setFont(undefined,"normal");
    y+=rowH;
  };

  drawRow(headers,{fill:true,bold:true});
  state.rows.filter(r=>r.producto).forEach(r=>{
    drawRow([r.producto,r.medidas,r.unidad,r.calibre,String(r.cantidad??0),r.notas]);
  });

  doc.save(`Listado_Materiales_${productosTitulo.replace(/\s+/g,'-')}.pdf`);
}
