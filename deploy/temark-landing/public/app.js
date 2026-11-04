const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const demoAppointments = [
  {time:'09:00', service:'Corte feminino', name:'Ana Clara'},
  {time:'10:30', service:'Coloração', name:'Juliana Mendes'},
  {time:'13:00', service:'Escova', name:'Beatriz Lima'},
  {time:'14:30', service:'Manicure', name:'Camila Souza'},
  {time:'16:00', service:'Design de sobrancelha', name:'Fernanda Alves'}
];
let selectedDay = '12';
const days = {'10':demoAppointments.slice(0,3),'11':demoAppointments.slice(2),'12':[...demoAppointments],'13':demoAppointments.slice(1,4),'14':demoAppointments.slice(0,2),'15':demoAppointments.slice(3),'16':[]};
function renderAppointments(){
  $('#appointments').innerHTML = days[selectedDay].length ? [...days[selectedDay]].sort((a,b)=>a.time.localeCompare(b.time)).map((item,index)=>`<div class="appointment"><time>${escapeHTML(item.time)}</time><span class="avatar a${index%5}" aria-hidden="true">${escapeHTML(item.name.split(' ').map(v=>v[0]).slice(0,2).join(''))}</span><span class="details"><strong>${escapeHTML(item.service)}</strong><small>${escapeHTML(item.name)}</small></span><span class="chevron" aria-hidden="true">›</span></div>`).join('') : '<p class="empty-day">Um dia livre por aqui.<br>Que tal adicionar uma marcação?</p>';
}
renderAppointments();
$$('[data-day]').forEach(button=>button.addEventListener('click',()=>{
  selectedDay=button.dataset.day;
  $$('[data-day]').forEach(day=>{day.classList.toggle('selected',day===button);day.setAttribute('aria-pressed',String(day===button));});
  renderAppointments();
}));
function showDialog(id){ const dialog=$(id); dialog.showModal(); document.body.classList.add('modal-open'); }
$$('dialog').forEach(dialog=>{
  $('.dialog-close',dialog).addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
});
const APP_ORIGIN = 'https://app.temark.com.br';
const CATEGORY_TO_TIPO = {
  'Cabeleireiros': 'salao-de-beleza',
  'Esteticistas': 'clinica-e-estetica',
  'Manicures e pedicures': 'esmalteria',
  'Barbearias': 'barbearias',
  'Clínicas de estética': 'clinica-e-estetica',
  'Outros profissionais': 'estudio-e-bem-estar',
};
function startUrl(category){
  const params = new URLSearchParams({ brand: 'temark' });
  const tipo = CATEGORY_TO_TIPO[category];
  if (tipo) params.set('tipo', tipo);
  return `${APP_ORIGIN}/onboarding?${params}`;
}
function openStart(category){ window.location.assign(startUrl(category)); }
$$('[data-start]').forEach(button=>button.addEventListener('click',()=>openStart()));
$$('[data-business]').forEach(button=>button.addEventListener('click',()=>openStart(button.dataset.business)));
$('#start-form')?.addEventListener('submit',event=>{
  event.preventDefault();
  openStart($('#business-type')?.value);
});
$('#business-name')?.addEventListener('input',()=>$('#business-name').setCustomValidity(''));
$('#new-booking').addEventListener('click',()=>showDialog('#booking-dialog'));
$('#booking-form').addEventListener('submit',event=>{
  event.preventDefault();const name=$('#client-name').value.trim();if(!name){$('#client-name').setCustomValidity('Digite o nome do cliente.');$('#client-name').reportValidity();return;}
  const time=$('#booking-time').value;
  if(days[selectedDay].some(item=>item.time===time)){$('#booking-time').setCustomValidity('Este horário já está ocupado na demonstração. Escolha outro.');$('#booking-time').reportValidity();return;}
  days[selectedDay].push({name,time,service:$('#service').value});renderAppointments();$('#booking-dialog').close();$('#booking-form').reset();toast(`Marcação adicionada ao dia ${selectedDay}, às ${time}.`);
});
$('#client-name').addEventListener('input',()=>$('#client-name').setCustomValidity(''));
$('#booking-time').addEventListener('input',()=>$('#booking-time').setCustomValidity(''));
$('#explore-agenda').addEventListener('click',()=>{$('#agenda-demo').scrollIntoView({behavior:'smooth',block:'center'});$('[data-day="12"]').focus({preventScroll:true});toast('Experimente: escolha um dia ou crie uma nova marcação.');});
let selectedService={name:'Corte feminino',price:'120'};
$$('[data-service]').forEach(button=>button.addEventListener('click',()=>{selectedService={name:button.dataset.service,price:button.dataset.price};$$('[data-service]').forEach(item=>item.classList.toggle('active',item===button));$('#payment-demo').innerHTML=`<svg><use href="#lock"/></svg>Simular ${Number(selectedService.price).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`;}));
$('#payment-demo').addEventListener('click',()=>{ $('#info-content').innerHTML=`<span class="eyebrow">Pagamento demonstrativo</span><h2 id="info-title">Tudo em <em>um lugar.</em></h2><p>Confira um exemplo de cobrança dentro da agenda.</p><div class="result-link">${escapeHTML(selectedService.name)}<br>${Number(selectedService.price).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div><p>Na plataforma conectada, o cliente poderá escolher Pix ou cartão e concluir o pagamento.</p><p class="result-summary">Esta prévia não processa pagamentos nem coleta dados financeiros.</p><button class="button yellow" id="close-payment">Entendi</button>`;showDialog('#info-dialog');$('#close-payment').addEventListener('click',()=>$('#info-dialog').close());});
const info={
  faq:{title:'Dúvidas? <em>A gente simplifica.</em>',html:'<h3>Como funciona a Temark?</h3><p>Você configura os serviços e horários, compartilha seu link e o cliente escolhe quando quer ser atendido.</p><h3>Funciona no celular?</h3><p>Esta página e a demonstração se adaptam ao celular, tablet e computador.</p><h3>Já posso criar uma conta?</h3><p>Sim. Em <strong>Criar minha agenda</strong> você inicia o cadastro real da Temark, configura o negócio e ativa o plano para começar a receber.</p>'},
  contact:{title:'Vamos <em>conversar.</em>',html:'<p>Para criar sua agenda, use o botão <strong>Criar minha agenda</strong>. Dúvidas sobre a conta ou o plano podem ser tratadas no suporte após o cadastro.</p>'},
  terms:{title:'Termos de uso',html:'<p>Esta página apresenta a Temark e contém demonstrações ilustrativas da agenda. O cadastro real, pagamentos e uso da plataforma seguem os termos apresentados no fluxo de criação de conta.</p>'},
  privacy:{title:'Sua privacidade',html:'<p>Os dados digitados na demonstração desta página ficam só no seu navegador e não são enviados ao servidor. Ao criar uma conta, os dados do cadastro são tratados conforme a política de privacidade apresentada no fluxo da plataforma.</p><p>As fontes são carregadas do Google Fonts, que recebe os dados técnicos necessários à entrega desses arquivos.</p>'}
};
$$('[data-info]').forEach(button=>button.addEventListener('click',()=>{const content=info[button.dataset.info];$('#info-content').innerHTML=`<h2 id="info-title">${content.title}</h2>${content.html}`;showDialog('#info-dialog');}));
const menu=$('.menu-toggle');menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');$('#navigation').classList.toggle('open',open);});
$$('#navigation a, #navigation button').forEach(link=>link.addEventListener('click',()=>{menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menu');$('#navigation').classList.remove('open');}));
document.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.setAttribute('aria-expanded','false');$('#navigation').classList.remove('open');}});
let toastTimeout;function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('#toast').classList.remove('visible'),4500);}
$('#year').textContent=new Date().getFullYear();
