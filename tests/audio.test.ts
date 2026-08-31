import test from 'node:test';
import assert from 'node:assert/strict';
import { playSound, playSynthSiren, stopSounds, disposeAudio } from '../src/audio/sound';

class Param { setValueAtTime(){} linearRampToValueAtTime(){} exponentialRampToValueAtTime(){} }
class Osc {
  frequency=new Param();type='sine';onended:(()=>void)|null=null;disconnected=false;
  connect(){}disconnect(){this.disconnected=true;}start(){}stop(){}
}
class Gain { gain=new Param();disconnected=false;connect(){}disconnect(){this.disconnected=true;} }
class Context {
  static all:Context[]=[];state='running';currentTime=0;destination={};nodes:Osc[]=[];gains:Gain[]=[];
  constructor(){Context.all.push(this);}
  createOscillator(){const o=new Osc();this.nodes.push(o);return o;}
  createGain(){const g=new Gain();this.gains.push(g);return g;}
  async resume(){this.state='running';}async close(){this.state='closed';}
}
test('effects share one context, release finished nodes, and close on disposal', async () => {
  Object.defineProperty(globalThis,'window',{configurable:true,value:{AudioContext:Context}});
  playSound('type');playSound('confirm');playSynthSiren();
  assert.equal(Context.all.length,1);
  const ctx=Context.all[0];assert.equal(ctx.nodes.length,4);
  ctx.nodes[0].onended?.();assert.equal(ctx.nodes[0].disconnected,true);
  stopSounds();assert.ok(ctx.nodes.every(n=>n.disconnected));assert.ok(ctx.gains.every(g=>g.disconnected));
  disposeAudio();assert.equal(ctx.state,'closed');
  playSound('next');assert.equal(Context.all.length,2);disposeAudio();
  delete (globalThis as any).window;
});
test('pending autoplay resume cannot start audio after closing the modal', async () => {
  let resolve!:()=>void;
  class Suspended extends Context {state='suspended';resume(){return new Promise<void>(r=>{resolve=()=>{this.state='running';r();};});}}
  Object.defineProperty(globalThis,'window',{configurable:true,value:{AudioContext:Suspended}});
  playSound('confirm');const ctx=Context.all.at(-1)!;
  disposeAudio();resolve();await Promise.resolve();await Promise.resolve();
  assert.equal(ctx.nodes.length,0);
  delete (globalThis as any).window;
});
