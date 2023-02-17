import*as s from"https://cdn.skypack.dev/three@0.133.1";import{EffectComposer as u}from"https://cdn.skypack.dev/three@0.133.1/examples/jsm/postprocessing/EffectComposer.js";import{RenderPass as f}from"https://cdn.skypack.dev/three@0.133.1/examples/jsm/postprocessing/RenderPass.js";import{UnrealBloomPass as p}from"https://cdn.skypack.dev/three@0.133.1/examples/jsm/postprocessing/UnrealBloomPass.js";import{ShaderPass as v}from"https://cdn.skypack.dev/three@0.133.1/examples/jsm/postprocessing/ShaderPass.js";import{OrbitControls as g}from"https://cdn.skypack.dev/three@0.124.0/examples/jsm/controls/OrbitControls";import P from"https://cdn.skypack.dev/three@0.124.0/examples/jsm/libs/stats.module";import*as w from"https://cdn.skypack.dev/dat.gui@0.7.7";import{ModifierStack as C,Twist as M,Vector3 as b}from"https://cdn.skypack.dev/three.modifiers@2.5.7";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&o(a)}).observe(document,{childList:!0,subtree:!0});function t(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(i){if(i.ep)return;i.ep=!0;const r=t(i);fetch(i.href,r)}})();const S=`
#define GLSLIFY 1
highp float random(vec2 co)
{
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

float qinticInOut(float t) {
  return t < 0.5
    ? +16.0 * pow(t, 5.0)
    : -0.5 * pow(2.0 * t - 2.0, 5.0) + 1.0;
}

varying vec2 vUv;
varying vec3 vPosition;

varying float vRandColor;
varying float vRandAlpha;

uniform float uSize;
uniform float uProgress;

void main(){
    // rand particle color and alpha
    float randColor=random(uv);
    float randAlpha=random(uv+50.);
    float randAnimeOffset=random(uv);
    
    vec3 newPos=position;
    
    // anime
    // newPos.y+=quinticInOut(clamp(0.,1.,(uProgress-uv.y*.6)/.4));
    
    vec4 modelPosition=modelMatrix*vec4(newPos,1.);
    vec4 viewPosition=viewMatrix*modelPosition;
    vec4 projectedPosition=projectionMatrix*viewPosition;
    
    gl_Position=projectedPosition;
    gl_PointSize=uSize*(1./-viewPosition.z);
    
    vUv=uv;
    vPosition=position;
    vRandColor=randColor;
    vRandAlpha=randAlpha;
}
`,y=`
#define GLSLIFY 1
float circle(vec2 st,float r){
    vec2 dist=st-vec2(.5);
    return 1.-smoothstep(r-(r*1.15),r,dot(dist,dist)*4.);
}

uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uGradInner;
uniform float uGradMaskTop;
uniform float uGradMaskBottom;

varying vec2 vUv;
varying vec3 vPosition;

varying float vRandColor;
varying float vRandAlpha;

void main(){
    // rand particle color
    vec3 color=uColor1;
    if(vRandColor>0.&&vRandColor<.33){
        color=uColor2;
    }else if(vRandColor>.33&&vRandColor<.66){
        color=uColor3;
    }
    color*=vRandAlpha;
    
    // circle alpha
    float alpha=circle(gl_PointCoord,1.);

    // vertical grad mask
    float gradMask=smoothstep(uGradMaskTop,uGradMaskBottom,vUv.y);
    alpha*=gradMask;
    
    vec4 finalColor=vec4(color,1.)*alpha;
    gl_FragColor=finalColor;
}
`,A=`
varying vec2 vUv;

void main(){
    vec4 modelPosition=modelMatrix*vec4(position,1.);
    vec4 viewPosition=viewMatrix*modelPosition;
    vec4 projectedPosition=projectionMatrix*viewPosition;
    gl_Position=projectedPosition;
    
    vUv=uv;
}
`,x=`
// Credit: https://github.com/spite/Wagner/blob/master/fragment-shaders/chromatic-aberration-fs.glsl

uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform sampler2D tDiffuse;

uniform float uCAMaxDistortion;
uniform float uCASize;

varying vec2 vUv;

vec2 barrelDistortion(vec2 coord,float amt){
    vec2 cc=coord-.5;
    float dist=dot(cc,cc);
    return coord+cc*dist*amt;
}

float sat(float t)
{
    return clamp(t,0.,1.);
}

float linterp(float t){
    return sat(1.-abs(2.*t-1.));
}

float remap(float t,float a,float b){
    return sat((t-a)/(b-a));
}

vec4 spectrum_offset(float t){
    vec4 ret;
    float lo=step(t,.5);
    float hi=1.-lo;
    float w=linterp(remap(t,1./6.,5./6.));
    ret=vec4(lo,1.,hi,1.)*vec4(1.-w,w,1.-w,1.);
    
    return pow(ret,vec4(1./2.2));
}

void main(){
    vec2 uv=vUv;
    
    float max_distort=uCAMaxDistortion;
    float size=uCASize;
    int num_iter=9;
    float reci_num_iter_f=1./float(num_iter);
    
    vec4 sumcol=vec4(0.);
    vec4 sumw=vec4(0.);
    for(int i=0;i<num_iter;++i)
    {
        float t=float(i)*reci_num_iter_f;
        vec4 w=spectrum_offset(t);
        sumw+=w;
        sumcol+=w*texture2D(tDiffuse,barrelDistortion(uv,size*max_distort*t));
    }
    
    vec4 color=sumcol/sumw;
    
    gl_FragColor=color;
}
`,m=n=>n.clientWidth/n.clientHeight,z=n=>({x:n.clientX/window.innerWidth*2-1,y:-(n.clientY/window.innerHeight)*2+1});class D{constructor(){this.mousePos=new s.Vector2(0,0),this.mouseSpeed=0}trackMousePos(){window.addEventListener("mousemove",e=>{this.setMousePos(e)}),window.addEventListener("touchstart",e=>{this.setMousePos(e.touches[0])},{passive:!1}),window.addEventListener("touchmove",e=>{this.setMousePos(e.touches[0])})}setMousePos(e){const{x:t,y:o}=z(e);this.mousePos.x=t,this.mousePos.y=o}trackMouseSpeed(){let e=-1,t=-1,o=0;window.addEventListener("mousemove",i=>{const r=i.pageX,a=i.pageY;e>-1&&(o=Math.max(Math.abs(r-e),Math.abs(a-t)),this.mouseSpeed=o/100),e=r,t=a}),document.addEventListener("mouseleave",()=>{this.mouseSpeed=0})}}class R{constructor(e,t=!1){this.debug=t,this.container=document.querySelector(e),this.perspectiveCameraParams={fov:75,near:.1,far:100},this.orthographicCameraParams={zoom:2,near:-100,far:1e3},this.cameraPosition=new s.Vector3(0,3,10),this.lookAtPosition=new s.Vector3(0,0,0),this.rendererParams={alpha:!0,antialias:!0},this.mouseTracker=new D}init(){this.createScene(),this.createPerspectiveCamera(),this.createRenderer(),this.createMesh({}),this.createLight(),this.createOrbitControls(),this.addListeners(),this.setLoop()}createScene(){const e=new s.Scene;if(this.debug){e.add(new s.AxesHelper);const t=P();this.container.appendChild(t.dom),this.stats=t}this.scene=e}createPerspectiveCamera(){const{perspectiveCameraParams:e,cameraPosition:t,lookAtPosition:o}=this,{fov:i,near:r,far:a}=e,l=m(this.container),c=new s.PerspectiveCamera(i,l,r,a);c.position.copy(t),c.lookAt(o),this.camera=c}createOrthographicCamera(){const{orthographicCameraParams:e,cameraPosition:t,lookAtPosition:o}=this,{left:i,right:r,top:a,bottom:l,near:c,far:h}=e,d=new s.OrthographicCamera(i,r,a,l,c,h);d.position.copy(t),d.lookAt(o),this.camera=d}updateOrthographicCameraParams(){const{container:e}=this,{zoom:t,near:o,far:i}=this.orthographicCameraParams,r=m(e);this.orthographicCameraParams={left:-t*r,right:t*r,top:t,bottom:-t,near:o,far:i,zoom:t}}createRenderer(){const{rendererParams:e}=this,t=new s.WebGLRenderer(e);t.setSize(this.container.clientWidth,this.container.clientHeight),this.resizeRendererToDisplaySize(),this.container.appendChild(t.domElement),this.renderer=t,this.renderer.setClearColor(0,0)}resizeRendererToDisplaySize(){const{renderer:e}=this;if(!e)return;const t=e.domElement,o=window.devicePixelRatio,{clientWidth:i,clientHeight:r}=t,a=i*o|0,l=r*o|0,c=t.width!==a||t.height!==l;return c&&e.setSize(a,l,!1),c}createMesh(e,t=this.scene){const{geometry:o=new s.BoxGeometry(1,1,1),material:i=new s.MeshStandardMaterial({color:new s.Color("#d9dfc8")}),position:r=new s.Vector3(0,0,0)}=e,a=new s.Mesh(o,i);return a.position.copy(r),t.add(a),a}createLight(){const e=new s.DirectionalLight(new s.Color("#ffffff"),.5);e.position.set(0,50,0),this.scene.add(e);const t=new s.AmbientLight(new s.Color("#ffffff"),.4);this.scene.add(t)}createOrbitControls(){const e=new g(this.camera,this.renderer.domElement),{lookAtPosition:t}=this;e.target.copy(t),e.update(),this.controls=e}addListeners(){this.onResize()}onResize(){window.addEventListener("resize",e=>{if(this.shaderMaterial)this.shaderMaterial.uniforms.uResolution.value.x=window.innerWidth,this.shaderMaterial.uniforms.uResolution.value.y=window.innerHeight,this.renderer.setSize(window.innerWidth,window.innerHeight);else{if(this.camera instanceof s.PerspectiveCamera){const t=m(this.container),o=this.camera;o.aspect=t,o.updateProjectionMatrix()}else if(this.camera instanceof s.OrthographicCamera){this.updateOrthographicCameraParams();const t=this.camera,{left:o,right:i,top:r,bottom:a,near:l,far:c}=this.orthographicCameraParams;t.left=o,t.right=i,t.top=r,t.bottom=a,t.near=l,t.far=c,t.updateProjectionMatrix()}this.renderer.setSize(this.container.clientWidth,this.container.clientHeight)}})}update(){console.log("animation")}setLoop(){this.renderer.setAnimationLoop(()=>{this.resizeRendererToDisplaySize(),this.update(),this.controls&&this.controls.update(),this.stats&&this.stats.update(),this.composer?this.composer.render():this.renderer.render(this.scene,this.camera)})}}class L extends R{constructor(e,t){super(e,t),this.clock=new s.Clock,this.cameraPosition=new s.Vector3(0,0,5),this.perspectiveCameraParams={fov:60,near:.1,far:100},this.params={color1:"#612574",color2:"#293583",color3:"#1954ec",progress:0,size:36,gradMaskTop:0,gradMaskBottom:0},this.bloomParams={bloomStrength:1.4,bloomRadius:.87,bloomThreshold:.23},this.caParams={CAMaxDistortion:.25,CASize:.58}}async init(){this.createScene(),this.createPerspectiveCamera(),this.createRenderer(),this.createDNAMaterial(),this.createSpiral(),this.setLoop()}createDNAMaterial(){const e=new s.ShaderMaterial({vertexShader:S,fragmentShader:y,side:s.DoubleSide,transparent:!0,depthWrite:!1,blending:s.AdditiveBlending,uniforms:{uTime:{value:0},uMouse:{value:new s.Vector2(0,0)},uResolution:{value:new s.Vector2(window.innerWidth,window.innerHeight)},uColor1:{value:new s.Color(this.params.color1)},uColor2:{value:new s.Color(this.params.color2)},uColor3:{value:new s.Color(this.params.color3)},uSize:{value:this.params.size},uGradMaskTop:{value:this.params.gradMaskTop},uGradMaskBottom:{value:this.params.gradMaskBottom},uProgress:{value:this.params.progress}}});this.DNAMaterial=e}createSphere(){const e=new s.SphereBufferGeometry(2,64,64),t=this.DNAMaterial,o=new s.Points(e,t);this.points=o,this.scene.add(o)}createSpiral(){const e=new s.CylinderBufferGeometry(.5,.5,5,3,60),t=this.DNAMaterial,o=new s.Points(e,t),i=new C(o),r=new M(360);r.vector=new b(0,1,0),i.addModifier(r),this.modifier=i,this.points=o,this.scene.add(o)}async loadDNAModel(){const e=await loadModel(DNAModelUrl),t=flatModel(e);printModel(t),this.modelParts=t}createDNA(){const{modelParts:e}=this,o=e[1].geometry;o.center();const i=this.DNAMaterial,r=new s.Points(o,i);r.position.y=-3,this.points=r,this.scene.add(r)}createPostprocessingEffect(){const e=new u(this.renderer);this.composer=e;const t=new f(this.scene,this.camera);e.addPass(t);const o=new p(new s.Vector2(window.innerWidth,window.innerHeight),1.4,.87,.23);o.strength=this.bloomParams.bloomStrength,o.radius=this.bloomParams.bloomRadius,o.threshold=this.bloomParams.bloomThreshold,e.addPass(o),this.bloomPass=o;const i=new v({vertexShader:A,fragmentShader:x,uniforms:{tDiffuse:{value:null},uResolution:{value:new s.Vector2(window.innerWidth,window.innerHeight)},uCAMaxDistortion:{value:this.caParams.CAMaxDistortion},uCASize:{value:this.caParams.CASize}}});i.renderToScreen=!0,e.addPass(i),this.caPass=i}update(){const e=this.clock.getElapsedTime(),t=this.mouseTracker.mousePos;this.DNAMaterial&&(this.DNAMaterial.uniforms.uTime.value=e,this.DNAMaterial.uniforms.uMouse.value=t),this.points&&(this.points.rotation.y=e*.1),this.bloomPass&&(this.bloomPass.strength=this.bloomParams.bloomStrength,this.bloomPass.radius=this.bloomParams.bloomRadius,this.bloomPass.threshold=this.bloomParams.bloomThreshold),this.caPass&&(this.caPass.uniforms.uCAMaxDistortion.value=this.caParams.CAMaxDistortion,this.caPass.uniforms.uCASize.value=this.caParams.CASize),this.modifier&&this.modifier.apply()}createDebugPanel(){const e=new w.GUI({width:300}),{params:t,bloomParams:o,caParams:i}=this,r=this.DNAMaterial.uniforms;e.addColor(t,"color1").onFinishChange(a=>{r.uColor1.value.set(a)}),e.addColor(t,"color2").onFinishChange(a=>{r.uColor2.value.set(a)}),e.addColor(t,"color3").onFinishChange(a=>{r.uColor3.value.set(a)}),e.add(r.uSize,"value").min(0).max(50).step(.01).name("size"),e.add(r.uGradMaskTop,"value").min(0).max(1).step(.01).name("gradMaskTop"),e.add(r.uGradMaskBottom,"value").min(0).max(1).step(.01).name("gradMaskBottom"),e.add(r.uProgress,"value").min(0).max(1).step(.01).name("progress"),e.add(o,"bloomStrength").min(0).max(10).step(.01),e.add(o,"bloomRadius").min(0).max(10).step(.01),e.add(o,"bloomThreshold").min(0).max(10).step(.01),e.add(i,"CAMaxDistortion").min(0).max(10).step(.01),e.add(i,"CASize").min(0).max(10).step(.01)}}const k=()=>{new L(".dna-particle",!1).init()};k();
