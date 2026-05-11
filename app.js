const prefersReducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cursor
const cur=document.getElementById('cursor');
const ring=document.getElementById('cursor-ring');
let mx=0,my=0,rx=0,ry=0;
if(cur&&ring&&window.matchMedia('(pointer:fine)').matches){
  document.addEventListener('mousemove',e=>{
    mx=e.clientX;my=e.clientY;
    cur.style.left=mx+'px';cur.style.top=my+'px';
  });
  function animRing(){
    rx+=(mx-rx)*.12;ry+=(my-ry)*.12;
    ring.style.left=rx+'px';ring.style.top=ry+'px';
    requestAnimationFrame(animRing);
  }
  animRing();
}

// Navigation
const nav=document.querySelector('.site-nav');
const navToggle=document.querySelector('.nav-toggle');
const navLinks=document.querySelector('.nav-links');
const sectionLinks=document.querySelectorAll('.nav-links a');
navToggle?.addEventListener('click',()=>{
  const open=navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded',String(open));
});
sectionLinks.forEach(link=>link.addEventListener('click',()=>{
  navLinks.classList.remove('open');
  navToggle?.setAttribute('aria-expanded','false');
}));
window.addEventListener('scroll',()=>{
  nav?.classList.toggle('scrolled',window.scrollY>16);
},{passive:true});

// Three.js background
(function(){
  if(prefersReducedMotion||!window.THREE)return;
  const canvas=document.getElementById('bg-canvas');
  if(!canvas)return;
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,.1,100);
  camera.position.z=3;
  const geo=new THREE.PlaneGeometry(8,8,80,80);
  const mat=new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0},uMouse:{value:new THREE.Vector2(.5,.5)}},
    vertexShader:`
      uniform float uTime;uniform vec2 uMouse;
      varying vec2 vUv;varying float vElevation;
      void main(){vUv=uv;
        float e=sin(position.x*2.+uTime)*.08+cos(position.y*2.+uTime*.7)*.06;
        e+=sin(distance(uv,uMouse)*12.-uTime*2.)*.04;
        vElevation=e;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position.x,position.y,e,1.);}
    `,
    fragmentShader:`
      uniform float uTime;varying vec2 vUv;varying float vElevation;
      void main(){
        float e=vElevation*5.+.5;
        vec3 c1=vec3(.0,.96,.83);vec3 c2=vec3(.0,.4,1.);vec3 c3=vec3(.02,.07,.1);
        vec3 col=mix(c3,mix(c2,c1,e),clamp(e*.8,0.,1.));
        float grid=step(.97,fract(vUv.x*30.))+step(.97,fract(vUv.y*30.));
        col+=grid*vec3(.0,.2,.15)*.15;
        gl_FragColor=vec4(col,.18);}
    `,
    transparent:true,side:THREE.DoubleSide
  });
  const mesh=new THREE.Mesh(geo,mat);
  scene.add(mesh);
  let mx2=.5,my2=.5,t=0;
  function resize(){
    const W=window.innerWidth,H=window.innerHeight;
    camera.aspect=W/H;camera.updateProjectionMatrix();
    renderer.setSize(W,H);renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  }
  document.addEventListener('mousemove',e=>{
    mx2=e.clientX/window.innerWidth;my2=1-e.clientY/window.innerHeight;
  },{passive:true});
  function animate(){
    requestAnimationFrame(animate);t+=.008;
    mat.uniforms.uTime.value=t;
    mat.uniforms.uMouse.value.x+=(mx2-mat.uniforms.uMouse.value.x)*.03;
    mat.uniforms.uMouse.value.y+=(my2-mat.uniforms.uMouse.value.y)*.03;
    renderer.render(scene,camera);
  }
  resize();animate();
  window.addEventListener('resize',resize);
})();

// Globe canvas
(function(){
  const canvas=document.getElementById('globe-canvas');
  if(!canvas)return;
  const parent=canvas.parentElement;
  const ctx=canvas.getContext('2d');
  let t=0;
  function resize(){canvas.width=parent.offsetWidth;canvas.height=parent.offsetHeight}
  function draw(){
    const W=canvas.width,H=canvas.height;
    const cx=W/2,cy=H/2,r=Math.min(W,H)*.38;
    ctx.clearRect(0,0,W,H);
    const g=ctx.createRadialGradient(cx-r*.2,cy-r*.25,0,cx,cy,r);
    g.addColorStop(0,'rgba(10,30,60,.9)');g.addColorStop(.6,'rgba(4,11,24,.85)');g.addColorStop(1,'rgba(0,0,0,.6)');
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
    ctx.strokeStyle='rgba(0,245,212,.12)';ctx.lineWidth=.8;
    for(let lat=-80;lat<=80;lat+=20){
      const y2=cy+r*Math.sin(lat*Math.PI/180);
      const rx2=r*Math.cos(lat*Math.PI/180);
      ctx.beginPath();ctx.ellipse(cx,y2,rx2,.18*rx2,0,0,Math.PI*2);ctx.stroke();
    }
    for(let lon=0;lon<180;lon+=20){
      const a=lon*Math.PI/180+t*.15;
      ctx.beginPath();ctx.ellipse(cx,cy,r*Math.abs(Math.cos(a)),r,.15,0,Math.PI*2);ctx.stroke();
    }
    const gx=cx+r*.05,gy=cy-r*.1,gw=r*.55,gh=r*.65;
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
    const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gw*.7);
    rg.addColorStop(0,'rgba(0,245,212,.18)');rg.addColorStop(1,'rgba(0,245,212,0)');
    ctx.fillStyle=rg;ctx.fillRect(gx-gw/2,gy-gh/2,gw,gh);
    ctx.strokeStyle='rgba(0,245,212,.55)';ctx.lineWidth=.8;
    const gStep=gw/14;
    for(let xi=0;xi<14;xi++){
      for(let yi=0;yi<20;yi++){
        const px=gx-gw/2+xi*gStep,py=gy-gh/2+yi*(gh/20);
        if(((xi*17+yi*9+Math.floor(t*50))%11)>7){
          ctx.fillStyle='rgba(0,245,212,.08)';
          ctx.fillRect(px,py,gStep-.5,gh/20-.5);
        }
        ctx.strokeRect(px,py,gStep-.5,gh/20-.5);
      }
    }
    ctx.restore();
    const rim=ctx.createRadialGradient(cx,cy,r*.85,cx,cy,r);
    rim.addColorStop(0,'transparent');rim.addColorStop(1,'rgba(0,245,212,.35)');
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle=rim;ctx.lineWidth=3;ctx.stroke();
    const atm=ctx.createRadialGradient(cx,cy,r*.9,cx,cy,r*1.15);
    atm.addColorStop(0,'rgba(0,245,212,.08)');atm.addColorStop(1,'transparent');
    ctx.beginPath();ctx.arc(cx,cy,r*1.15,0,Math.PI*2);ctx.fillStyle=atm;ctx.fill();
    t+=prefersReducedMotion?0:.004;
    requestAnimationFrame(draw);
  }
  resize();draw();
  window.addEventListener('resize',resize);
})();

// Fog of war demo
(function(){
  const canvas=document.getElementById('fog-canvas');
  if(!canvas)return;
  const parent=canvas.parentElement;
  const ctx=canvas.getContext('2d');
  let W=0,H=0,pts=[],revealed=[],t=0;
  function resize(){W=canvas.width=parent.offsetWidth||280;H=canvas.height=140;makePath()}
  function drawMap(){
    ctx.fillStyle='#071326';ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(0,245,212,.15)';ctx.lineWidth=.5;
    for(let x=0;x<W;x+=14){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
    for(let y=0;y<H;y+=14){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    ctx.strokeStyle='rgba(0,245,212,.4)';ctx.lineWidth=1.5;
    [20,60,100,140,180,220].forEach(x=>{ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()});
    [35,70,105].forEach(y=>{ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()});
  }
  function makePath(){
    pts=[];let x=W*.2,y=H*.5;
    pts.push({x,y});
    for(let i=0;i<40;i++){
      x+=4+(Math.random()*6);y+=Math.sin(i*.4)*(Math.random()*8-4);
      pts.push({x:Math.min(x,W*.9),y:Math.max(10,Math.min(H-10,y))});
    }
  }
  function step(){
    drawMap();
    ctx.fillStyle='rgba(4,11,24,.82)';ctx.fillRect(0,0,W,H);
    revealed.forEach(p=>{
      ctx.save();ctx.globalCompositeOperation='destination-out';
      const g2=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,20);
      g2.addColorStop(0,'rgba(0,0,0,.95)');g2.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g2;ctx.beginPath();ctx.arc(p.x,p.y,20,0,Math.PI*2);ctx.fill();
      ctx.restore();
    });
    if(pts[t]){
      const pp=pts[t];
      ctx.beginPath();ctx.arc(pp.x,pp.y,4,0,Math.PI*2);ctx.fillStyle='#00f5d4';ctx.fill();
      ctx.beginPath();ctx.arc(pp.x,pp.y,12,0,Math.PI*2);ctx.strokeStyle='rgba(0,245,212,.4)';ctx.lineWidth=1.5;ctx.stroke();
      if(!prefersReducedMotion)revealed.push({x:pp.x,y:pp.y});
      if(revealed.length>80)revealed.shift();
    }
    if(!prefersReducedMotion)t=(t+1)%pts.length;
    if(t===0){revealed=[];makePath()}
    requestAnimationFrame(step);
  }
  resize();step();
  window.addEventListener('resize',resize);
})();

// City map canvas
(function(){
  const canvas=document.getElementById('city-canvas');
  if(!canvas)return;
  const parent=canvas.parentElement;
  const ctx=canvas.getContext('2d');
  let t=0,explorerX=0,explorerY=0,revealedPts=[];
  function resize(){
    canvas.width=parent.offsetWidth;canvas.height=parent.offsetHeight;
    explorerX=canvas.width*.45;explorerY=canvas.height*.5;
  }
  function draw(){
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle='#040d1a';ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(0,245,212,.08)';ctx.lineWidth=.5;
    const step=32;
    for(let x=0;x<W;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
    for(let y=0;y<H;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    ctx.strokeStyle='rgba(0,245,212,.25)';ctx.lineWidth=1.5;
    [W*.2,W*.4,W*.6,W*.8].forEach(x=>{ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()});
    [H*.25,H*.5,H*.75].forEach(y=>{ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()});
    for(let bx=0;bx<W;bx+=step){
      for(let by=0;by<H;by+=step){
        if(((bx+by+t)%211)===0){ctx.fillStyle='rgba(0,245,212,.04)';ctx.fillRect(bx+2,by+2,step-4,step-4)}
      }
    }
    ctx.fillStyle='rgba(4,11,24,.88)';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalCompositeOperation='destination-out';
    revealedPts.forEach((p,i)=>{
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,60);
      const alpha=Math.min(1,i/10);
      g.addColorStop(0,`rgba(0,0,0,${.92*alpha})`);
      g.addColorStop(.6,`rgba(0,0,0,${.5*alpha})`);
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,60,0,Math.PI*2);ctx.fill();
    });
    ctx.restore();
    ctx.beginPath();ctx.arc(explorerX,explorerY,6,0,Math.PI*2);ctx.fillStyle='#00f5d4';ctx.fill();
    const rp=(t*.04%1);
    ctx.beginPath();ctx.arc(explorerX,explorerY,6+rp*30,0,Math.PI*2);ctx.strokeStyle=`rgba(0,245,212,${.7*(1-rp)})`;ctx.lineWidth=2;ctx.stroke();
    if(!prefersReducedMotion){
      explorerX+=Math.sin(t*.023)*1.2;explorerY+=Math.cos(t*.018)*1.1;
      explorerX=Math.max(60,Math.min(W-60,explorerX));explorerY=Math.max(60,Math.min(H-60,explorerY));
      revealedPts.push({x:explorerX,y:explorerY});
      if(revealedPts.length>200)revealedPts.shift();
      t++;
    }
    requestAnimationFrame(draw);
  }
  resize();draw();
  window.addEventListener('resize',resize);
})();

// Leaderboard
(function(){
  const explorers=[
    {rank:1,name:'NightWalker_K',city:'New York',area:'847 km²',pct:94,xp:'128,450'},
    {rank:2,name:'UrbanPhantom',city:'Tokyo',area:'712 km²',pct:82,xp:'109,200'},
    {rank:3,name:'FogBreaker88',city:'London',area:'601 km²',pct:79,xp:'98,730'},
    {rank:4,name:'GeoSerpent',city:'Berlin',area:'540 km²',pct:71,xp:'85,100'},
    {rank:5,name:'DawnTracer',city:'Paris',area:'488 km²',pct:65,xp:'72,800'},
    {rank:6,name:'MapHunter_Z',city:'Sydney',area:'412 km²',pct:58,xp:'61,450'},
    {rank:7,name:'CoordWitch',city:'Seoul',area:'378 km²',pct:51,xp:'54,200'}
  ];
  const medals=['🥇','🥈','🥉'];
  const rankClass=['rank-1','rank-2','rank-3'];
  const initials=name=>name.slice(0,2).toUpperCase();
  const tbody=document.getElementById('lb-body');
  if(!tbody)return;
  tbody.innerHTML=explorers.map((e,i)=>`
    <tr>
      <td class="${rankClass[i]||''}" style="font-family:var(--font-mono)">${e.rank<=3?medals[e.rank-1]:e.rank}</td>
      <td><div class="explorer-name"><div class="explorer-avatar">${initials(e.name)}</div>${e.name}</div></td>
      <td><span class="tag-city">${e.city}</span></td>
      <td style="font-family:var(--font-mono);color:var(--cyan)">${e.area}</td>
      <td><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${e.pct}%"></div></div></td>
      <td style="font-family:var(--font-mono);color:var(--muted)">${e.xp}</td>
    </tr>
  `).join('');
  setInterval(()=>{
    tbody.querySelectorAll('tr').forEach(row=>{
      const bar=row.querySelector('.progress-bar-fill');
      if(bar&&Math.random()>.7){
        const w=parseInt(bar.style.width,10)+Math.floor(Math.random()*2);
        bar.style.width=Math.min(100,w)+'%';
      }
    });
  },2000);
})();

// Scroll reveal and active nav
const obs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')});
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));

const activeObs=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    const id=entry.target.id;
    sectionLinks.forEach(link=>link.classList.toggle('active',link.getAttribute('href')==='#'+id));
  });
},{rootMargin:'-40% 0px -50% 0px'});
document.querySelectorAll('main section[id]').forEach(section=>activeObs.observe(section));

// Counter animation
const counterObs=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    const el=entry.target;
    const target=parseFloat(el.getAttribute('data-target'));
    const isFloat=target%1!==0;
    let current=0,steps=60;
    const inc=target/steps;
    const timer=setInterval(()=>{
      current+=inc;
      if(current>=target){current=target;clearInterval(timer)}
      el.textContent=isFloat?current.toFixed(1):Math.floor(current).toLocaleString();
    },25);
    counterObs.unobserve(el);
  });
},{threshold:.3});
document.querySelectorAll('[data-target]').forEach(el=>counterObs.observe(el));

// Magnetic controls
document.querySelectorAll('.map-btn,.btn-primary,.btn-ghost,.nav-cta').forEach(btn=>{
  btn.addEventListener('mousemove',e=>{
    if(!window.matchMedia('(pointer:fine)').matches)return;
    const rect=btn.getBoundingClientRect();
    const dx=(e.clientX-rect.left-rect.width/2)*.18;
    const dy=(e.clientY-rect.top-rect.height/2)*.18;
    btn.style.transform=`translate(${dx}px,${dy}px)`;
  });
  btn.addEventListener('mouseleave',()=>btn.style.transform='');
});

// Global explored counter
let globalPct=24.7;
setInterval(()=>{
  globalPct+=Math.random()*.01;
  const el=document.getElementById('pct-global');
  if(el)el.textContent=globalPct.toFixed(1)+'%';
},3000);
