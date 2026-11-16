// Browser-only entropy adapter; the returned text is the sole world-seed input.
export function randomWorldSeed(cryptoSource,clock=Date.now(),subTick=0){
  const bytes=new Uint32Array(2);
  let filled=false;
  try{
    const source=cryptoSource??globalThis.crypto;
    if(source?.getRandomValues){source.getRandomValues(bytes);filled=true;}
  }catch{}
  if(!filled){bytes[0]=Number(clock)>>>0;bytes[1]=Math.floor(Number(subTick)*1000)>>>0;}
  return `ASH-${bytes[0].toString(16).toUpperCase().padStart(8,"0")}${bytes[1].toString(16).toUpperCase().padStart(8,"0")}`;
}
