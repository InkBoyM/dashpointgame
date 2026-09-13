/* Story Mode + Play menu + Boss fight — auto-generated from bossfight.html */
(function(){
  "use strict";
  const ORDER = ["story_w1l1.dashpoint.json","story_w1l2.dashpoint.json","story_w1l3.dashpoint.json","story_w1l4.dashpoint.json","story_w1l5.dashpoint.json"];
  const LABELS = ["1","2","3","4","5"];
  const BOSS_FILE = "__boss__";
  const POS = [
    {x:12,y:70},{x:30,y:54},{x:50,y:64},{x:68,y:48},{x:84,y:58},
    {x:50,y:18}
  ];
  const POS_MOBILE = [
    {x:28,y:82},{x:68,y:68},{x:32,y:54},{x:68,y:40},{x:32,y:26},{x:58,y:8}
  ];
  function curPOS(){ return (window.innerWidth<=700) ? POS_MOBILE : POS; }
  const F = {
  "idle1": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAADVklEQVR4nO2aLW8UQRjH55kslpALJCXpVdAKaMUZDOVCUBhSkIcBgUDwBVoDDlK+AKICAQYkNBgkOcBgTpQgWgRtQhPIhWARR56FaabDvL/tpje/ZHP7Ojv//zzzzEy3hBQKhUKhUChkZDC8OyEtgZIphzbV+m2JAkqmHBqjkNStmbJ8SjIiCmlDN6CxCkolJnXOoKEFtKEVW9MFBhozVNd8npnaUWCQwBBKWlBx2fVcXYuGPNxkxY9cF+iuLE5wy50XKEkAVpIJsq3w8url+peZMHURIBrhg4954Psym5bd/7znXO7M2Vmr+170H4NM8O7mJydNFWkZomlfXm5L74vVVSDkYb4SZ64vkJiohJtwjQBog3hfsT6CRSBEfKxWtzXg66utg/25a0tRTICmxasM4MWqiGECbVo8gy9TJX5zfr7eTPclMaC31k82QUHxLAp0olZ2dupfmQm+o0LlKjxF6+tgYlE8Lxz3mSHJIqDXsHgeXrwKnyiocod726hiCv+5PVZeO7HQ8SpTDH3+fAxAdlJlhEyETrSrGbpEyJvAi2dDIZ9IXYbESnZytD4Em4jwEc+e00UEihJNkLU4Pw9IkgRH/4yQCfAVryuDT7Imcfz1kORMTTeMt8b1xggVLsLKu7h8vt5uPrphNCGWeKflsG8S03H11hXpeTTh2epzYyTEGJYr3zl7Z6mTRDyDRQIzItV8BHyXvWiGjwkm4S68e//x0LHPKAA2N6EJMtddTYgh/sG5e4eOT5/qkmMXjv93HxtFAACCkmBXIR7B83yCzA0vHuvCNj53zJycnXjngN5afxJLYGjrP7m08feXbJBv33frfRQvaxyVCfs/9uDIrAXmLCdBaNLvD7/yrAVyYxoN+OmxVQ4YrQ9BNftrmttv79Qb6/suYOjLwl+ZBHkjMMurXPQdCmMZEQOqu6gzwVX866dvSGxM4W3z12awfZk4IjQ9CWKzRF0eQANMkyLweXFIsoxpwsPF+wffB8VZqu2MEEIq0JQRKJw/DvlICiQQHxPYyhKXv6HiQ4GYhenMMC2ndWZgX8ecgzko9FugCJDIYDiyyoYiJtoUBlQkEXzlXc3IObeocryECbJpwdz/I1SlKDQ0/HMusWm2NxUKhQJpH38A+ZOqX/fLXbAAAAAASUVORK5CYII=",
  "idle2": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAADVklEQVR4nO2aLW8UQRjH55kslpALJCXpVdAKaMUZDOVCUBhSkIcBgUDwBVoDDlK+AKICAQYkNBgkOcBgTpQgWgRtQhPIhWARR56FaabDvL/tpje/ZHP7Ojv//zzzzEy3hBQKhUKhkJXB8O6EtARKphzaVOu3JQoomXJojEJSt2bK8inJiCikDd2AxioolZjUOYOGFtCGVmxNFxhozFBd83lmakeBQQJDKGlBxWXXc3UtGvJwkxU/cl2gu7I4wS13XqAkAVhJJsi2wsurl+tfZsLURYBohA8+5oHvy2xadv/znnO5M2dnre570X8MMsG7m5+cNFWkZYimfXm5Lb0vVleBkIf5Spy5vkBiohJuwjUCoA3ifcX6CBaBEPGxWt3WgK+vtg72564tRTEBmhavMoAXqyKGCbRp8Qy+TJX4zfn5ejPdl8SA3lo/2QQFxbMo0Ila2dmpf2Um+I4KlavwFK2vg4lF8bxw3GeGJIuAXsPieXjxKnyioMod7m2jiin85/ZYee3EQserTDH0+fMxANlJlREyETrRrmboEiFvAi+eDYV8InUZEivZydH6EGwiwkc8e04XEShKNEHW4vw8IEkSHP0zQibAV7yuDD7JmsTx10OSMzXdMN4a1xsjVLgIK+/i8vl6u/nohtGEWOKdlsO+SUzH1VtXpOfRhGerz42REGNYrnzn7J2lThLxDBYJzIhU8xHwXfaiGT4mmIS78O79x0PHPqMA2NyEJshcdzUhhvgH5+4dOj59qkuOXTj+331sFAEACEqCXYV4BM/zCTI3vHisC9v43DFzcnbinQN6a/1JLIGhrf/k0sbfX7JBvn3frfdRvKxxVCbs/9iDI7MWmLOcBKFJvz/8yrMWyI1pNOCnx1Y5YLQ+BNXsr2luv71Tb6zvu4ChLwt/ZRLkjcAsr3LRdyiMZUQMqO6izgRX8a+fviGxMYW3zV+bwfZl4ojQ9CSIzRJ1eQANME2KwOfFIckypgkPF+8ffB8UZ6m2M0IIqUBTRqBw/jjkIymQQHxMYCtLXP6Gig8FYhamM8O0nNaZgX0dcw7moNBvgSJAIoPhyCobiphoUxhQkUTwlXc1I+fcosrxEibIpgVz/49QlaLQ0PDPucSm2d5UKBQKhQJpG38AHmiqX9XbQIkAAAAASUVORK5CYII=",
  "windup": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAADwklEQVR4nO1av2sUQRSeGfYPkEMhQs7CpIgJeAhWMYiVjUbL2JjCwsLOKjaxUxIQ7AQtLLQxpcY/QCSGFIJEOEmRWJiAAWWxsY68hXe8G2dm59f+ODIfDLs7O/Nuvu+9eTNzd4wlJCQkJCQk1ImFjXtHrCUQ7JhDNOX9KqOg92DO2rZgxxxiFOa0i30X79ceATKREOFURMHe1PXzDArcy/ZVfYTvAFQfHsuWyq7KPhCCsvV3qyi6/lB0kSFiDbBubK9scLg+X34yqLt/YVHbHqIC+1Q2BRYMYuje+fShpELHJ9gIQUXg6ZdXyntbCFYDyjypeu/SB4jbkpftCqtelsZ0dbHhutSZIFhL0J2fPoJiEnHn/dco5HH1YIyx/7KiC0ze3lz9UFxnl65Y27Ptszb3jIdEGvRvXQQgXASLAe7b0cYDhzsHznbHpsat2vlGAfU+IGMtgyza97e7ynaYL0LBQzrTQZy9OcliQkcc0ZnpOG+GIInKu8GsDeTLyOqQ93O2tmI3FSD0VSsIDyEfy+u2Avx41x/cn7kxM7jfX//GYUyqBAorC7zX2eRNk9cJQMnqQEWg4/mzm7MTk50h+zoRRNPkEdSmjvz6xERRytq5JE3RxPZTRR6jwERqfm+vuFIRsD8F9b7qvVMS7EnEq/C+CUgWyFPicI+ChEC0mTyF7PVYyOoO9yoA08fkHNMqk8UkDtlXB3le2kIOfVqPOYOuBjroVgGuqtQJoSJhIu0qhikRUhHo3JfJ00hAe977gJ4khDxwH/I6W3Ko+uwDVKFuIm+1EaIi4KBDiJcJYSuCahNk43HnfUDez4uCiEme2rs0e7Eot1dvDd7p5rZuB+iDzLahbxIz4driVWU9iPB66U1xb0pwMZblzKUxDU88jsYmj8BIQCGq2o9w32MviOEjQhlxF3za/Dz07JMDuE0jEEGluqsIMcg/Orc89Hz6VHfo+eev/aFnzjkPSoJdDXkA1NMEWTdk8qq6sZPjR9HOAiEI9f7Lyy+KoiKtA7YFEXRCZKN6FjAJAe/kqVDLWWAUkdEH/Ma0jULc+Xi3uNpOA9rm8PdB2Fkg7+csdBWIufyhEGUwEXc+C+SSCD77gNgiAB5PP+SV7gS3ybSIuRNsC7hPp5AcETMKQr0PCDLQlBAxiEf5eXxb8a8r25OlvI9vgjwgqjFTRJQdp+G7AB3gRAg5BxKxy0HHBpxFBpwdcLChkBNtFQJkrCLQwbuKUecKk9XxIUjIxoOx/vjQqAB5YPjXecQWtX1SQkJCQgJrHf4BhovqHI/ZeWwAAAAASUVORK5CYII=",
  "throwf": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAADZ0lEQVR4nO2ar2+UMRjH26ZYQi6QjGSHYBNsEzMYxkJQGDKQhwGBQPAPHAYcC/wDCMQECEZQbMFMkgEGgxhBbEuAiQmyECziyHPwHE1p+/b323H9JJfdvW/bt99vnz5t70ZIpVKpVCqVSkZ6m7cHpBAYGXNYW6NfShQwMuawGI2kHs2U7TOSEVlICdOAxWoolZjUOYOFNlDCKBYzBXoGM3T3fOqM7SrQS2AIIwV0XHU/19RiIZXb7Ph/NwW6S7MDeOXOC4wkADqJgmw7vNC/OPyLJoxdBMhG+OBjHvV9mM3I7n/ac2534sykVbnni4+oSvDX9Y9OmjgpDNm03ZfbynKxpgoNqSx24vTVaRITnfAmXCOAliDeV6yPYBkaIj7WqNsa8GVta/T+1JW5KCbQtsXrDBDF6ohhAmtbPCK2qRO/PjU1fDWVS2LA/J3FZBsUEI9RYBK1tLMz/KsywXdV4K7CU4y+CRQL4kXh8B4NSRYB8y2LFxHF6/CJAp473EuDxxT+fftAe+/YdMerTTn0xesxoKqLOiNUIkyiXc0wJULRBFE8LoViInVZErnq4ocHm9QmInzEYz1TRIAo2QTViIv7ABnbgxJt6qxoAnbaV7gK2QhxU2RaEkXxmJzFuqqErYoQ2tRBdLIz1xl2NqZ4BNo9v3B29Plpf5W8WF3xbq//bFl7TzaBu3QyNpdvXFJev/7wGkmFmCucvw8QK0JEpBCPrH3eGEWDjC68bfcpf8oNIAqsDZAfAJ99TGgS7hINb96+J6HwpgLgEuQB2V0MJRcTXMWruD9z9++HGUJOnugO3x45dzTNYairEI/A9YOt+EnRFhQP/Hz3w/p7BSiHSZCZCsbcEscYfVm0iiYT5Pv8MJ0FVi48NhoBUQBTQZcQVfsAfhiEy+JNgAnALvk3ElQ7Qe6zBW6bpmkgGtEEU10EI9AMyPK6eeW7FJYEM900meAq/tWT3xsbX26+vhVUf//bnnLbT20bgGkhLnk5NkEhucBGPOD1VXJIjshtgkk8EPSrSltGLM/eG/Z74vjkwFd4FAN8TcCTpXgEdhUfCxqzMZMZTcdpkxlwIoScAzko9LdAGUoiA2cH7GwocqJNYQAniRA772pGzr0Fz/EQFGQzgrn/R4inaDQ0/HMesVm2J1UqlQopj1/5lrMRcjEskQAAAABJRU5ErkJggg==",
  "recover": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAADPElEQVR4nO1aPW8UMRC1raVF6ESkRMpRkBSQFGloCBGiokGB8migoKDgD4QGOhD8AQoKGhooIf8ABWhorgiiSCggRQp0QrQUQbNiToNle/29JucnWXu3Xo/9nsfj8e0xVlFRUVFRUVFRkQ+jnXtHrBAINuMQfc1+KV4g2IxDxDCSejZT2hcsI2QiJSwDEctQKjKpY4YINVDCLBazBEYGMXR1Pm1mdhcYJRBEsAIGrqrPtbRESOM+B37slsBwc+UISu64IFgCwCCRkO2A17eutFcUYeY8QBbCBz7icd/ObGb28MuBs935c4tWz73eeMZVhL9vf3bi1LDCIIv29c2e8rlYS4WHNKaDOHtjmcWEjngXXD2Al0Del6wPYRk8hHysWbcV4Nvb3ennM9dXo4jA+yavE4CS1SGGCKJv8ghqU0d+e2mpLV3PJRFg7f5GsgQFyKMXmEht7u+3V5UIvrtC40o8xeybgGSBPCUOn1GQZB6w1jN5CkpeBx8vaHK7e2loYhL/uTfR1p1aHnjZlF2f3o8BrrqpE0JFwkTaVQxTIKQiUPK4FdJA6rIlNqqb4yc73MYjfMhjO5NHAClZBNWM0zwgSRAc/xVCRcCXvMkGDbJd5Gh9SHAWXQ9MdidtQYQSl4H2Lq1faMutpzc7RYhF3uk47BvETLh2+6ryPojwcutVpyfE2Ja5S/pLc/bB6iAJeRkoRBdx1XnCJhhy32MvdOgjgi1xG7z/8Gk6FtX4bETgNh2BCDrVXUSIQf7R+Qf/fIclYloKMEaTCMKXPADu0wCZG7bboClFFqaGMVPi0Nl/cfl5Wxbmhk6BEOvnTy8eHauzwMLckJ24eLKss8D/CCFnfrrsr2/ceXe3LQC6DLp+T8T6wx8H3DoGjIkQEOV1nfhuhbGE+P3xl1Ub0y7AuxrjsoBoH5oHxMwBEI9XHk7fECXLA1AIuuX1nQRRAeDq+5qM+3QaEixjioDkQ8BDGvclRAziUV6Pjz13DDhZYh7fJ3lAVGMmj+g6TsNvAaYTIcQciEGh7wJlcBYZEIxwsKGQA20KARqWCHTwrmLkzC2aHJ0gIZsZzP0foSaF0VD3z3nEFtl6qqioYAXiD8LIo7N1KkYzAAAAAElFTkSuQmCC",
  "p1": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAjklEQVR4nGNgoCYIP5L1X7/C5j+IJlYPE1VdQI4rmBhoAcJJcAUTPskVog8Y/t/0+g/CuNQw4pLApinitQKGOhYGEsCNLZeIMyAc7PcHGOIaPnrEu8Bg/ieGC4l8cD6j+jZGogIxHCnkQX4GacSlGasBDFC/YnMuQQPQ432lzTScNmM1AKSBFNtxAlJyIwB/ET8llFYBkQAAAABJRU5ErkJggg==",
  "p2": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAg0lEQVR4nGNgGD4g/EjWf3LUM4II/Qqb/xo+enDJlTbTGPFpvLHlEph9seMIIyPMJJggzCBkQ/CpYcSnaIXoA7jNBvM/gcXQXceIKxyQNcMVq2/D8BoTMgdkOj7/YwOMuCT+3/T6T7IL8CnGphmvASAQ8VoBHHggGhdgwilDJBgGBgAAEFU7WR26+bAAAAAASUVORK5CYII="
};
  const BG_HILL = "data:image/png;base64,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";
  const BG_MEADOW = "data:image/png;base64,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";

  function qs(id){ return document.getElementById(id); }
  function getSave(){ try{ const d=(window.__DPStory&&__DPStory.getData&&__DPStory.getData())||{}; if(!d.story) d.story={beaten:{}}; if(!d.story.beaten) d.story.beaten={}; return d; }catch(e){ return {story:{beaten:{}}}; } }
  function isBeaten(file){ const d=getSave(); return !!(d.beaten&&d.beaten[file]) || !!(d.story&&d.story.beaten&&d.story.beaten[file]); }
  function isBossBeaten(){ const d=getSave(); return !!(d.story&&d.story.beaten&&d.story.beaten[BOSS_FILE]); }
  function isUnlocked(idx){
    if(idx===5) return ORDER.every(isBeaten);
    if(idx===0) return true;
    return isBeaten(ORDER[idx-1]);
  }
  function currentSkinSrc(){
    try{
      const img=qs("homeSkinPreview"); if(img&&img.src) return img.src;
      const d=getSave(); const id=(d.skin||1); const s=(window.DashPointSkins||[]).find(x=>x.id===id); if(s) return s.src;
    }catch(e){}
    return "assets/skins/skin-1.png";
  }
  function showScreen(name){
    document.querySelectorAll(".screen").forEach(function(s){ s.classList.remove("visible"); });
    const t=qs("screen-"+name); if(t) t.classList.add("visible");
  }
  let walkerIdx = 0;
  let walkerEl = null;

  function buildMap(){
    const host=qs("storyMap"); if(!host) return;
    host.innerHTML="";
    host.style.minHeight="520px";
    const svgNS="http://www.w3.org/2000/svg";
    const svg=document.createElementNS(svgNS,"svg");
    svg.setAttribute("viewBox","0 0 100 100"); svg.setAttribute("preserveAspectRatio","none");
    svg.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
    const pts = curPOS().map(function(p){ return p.x+","+p.y; }).join(" ");
    const pl=document.createElementNS(svgNS,"polyline");
    pl.setAttribute("points", pts);
    pl.setAttribute("fill","none"); pl.setAttribute("stroke","rgba(255,255,255,0.55)"); pl.setAttribute("stroke-width","0.7"); pl.setAttribute("stroke-dasharray","1.2 1.2"); pl.setAttribute("stroke-linecap","round"); pl.setAttribute("stroke-linejoin","round");
    svg.appendChild(pl);
    host.appendChild(svg);
    walkerEl=document.createElement("img");
    walkerEl.id="storyWalker";
    walkerEl.alt="";
    walkerEl.style.imageRendering="pixelated";
    host.appendChild(walkerEl);
    for(let i=0;i<6;i++){
      const isBoss=i===5;
      const nd=document.createElement("button");
      nd.className="story-node"+(isBoss?" story-node-boss":"");
      const pp=curPOS()[i];
      nd.style.left=pp.x+"%"; nd.style.top=pp.y+"%";
      nd.dataset.idx=String(i);
      if(isBoss){ nd.textContent="\u2605"; nd.title="BOSS — Bristleback"; }
      else { nd.textContent=LABELS[i]; nd.title="Grassy Greens "+LABELS[i]; }
      const lab=document.createElement("span"); lab.className="story-node-label";
      lab.textContent=isBoss ? "BOSS" : ("W1-" + LABELS[i]);
      nd.appendChild(lab);
      nd.addEventListener("click", function(){
        const idx=parseInt(this.dataset.idx,10);
        if(!isUnlocked(idx)){ this.animate([{transform:"translate(-50%,-50%) translateX(-4px)"},{transform:"translate(-50%,-50%) translateX(4px)"},{transform:"translate(-50%,-50%)"}],{duration:180}); return; }
        walkerIdx=idx; positionWalker(false);
        if(idx===5) openBoss();
        else {
          const file=ORDER[idx];
          if(window.__DPStory&&__DPStory.playFile) window.__DPStory.playFile(file);
        }
      });
      host.appendChild(nd);
    }
    const hint=document.createElement("div"); hint.id="storyHint"; hint.textContent="\u2190 \u2192 move  \u00b7  ENTER / click to play";
    host.appendChild(hint);
    refreshMap();
  }

  function positionWalker(animate){
    if(!walkerEl) return;
    const p=curPOS()[walkerIdx];
    walkerEl.style.left=p.x+"%"; walkerEl.style.top=p.y+"%";
    const src=currentSkinSrc();
    if(walkerEl.getAttribute("src")!==src) walkerEl.src=src;
  }

  function refreshMap(){
    const nodes=document.querySelectorAll(".story-node");
    nodes.forEach(function(nd){
      const idx=parseInt(nd.dataset.idx,10);
      const locked=!isUnlocked(idx);
      const beaten = idx===5 ? isBossBeaten() : isBeaten(ORDER[idx]);
      nd.classList.toggle("locked", locked);
      nd.classList.toggle("cleared", !!beaten);
      nd.classList.toggle("current", idx===walkerIdx);
      if(idx===5){
        nd.style.background = beaten ? "#1a6b2e" : (locked ? "#3a2a2a" : "#5a1020");
        nd.style.color = "#ffd23f";
      } else {
        if(beaten){ nd.style.background="#1a6b2e"; nd.style.color="#fff"; }
        else if(locked){ nd.style.background="#3a3a4a"; nd.style.color="#888"; }
        else { nd.style.background="#1d4d2a"; nd.style.color="#fff"; }
      }
    });
    let firstUnbeaten = ORDER.findIndex(function(f){ return !isBeaten(f); });
    if(firstUnbeaten===-1) firstUnbeaten = isBossBeaten()?5:5;
    let target = firstUnbeaten;
    if(target===5 && !isUnlocked(5)){
      for(let i=ORDER.length-1;i>=0;i--) if(isUnlocked(i)){ target=i; break; }
    }
    if(!isUnlocked(walkerIdx)) walkerIdx=target;
    if(!isUnlocked(walkerIdx)) walkerIdx=target;
    while(walkerIdx>0 && !isUnlocked(walkerIdx)) walkerIdx--;
    positionWalker(true);
  }

  function wirePlayMenu(){
    const a=qs("btnPlayCampaign"), b=qs("btnPlayStory"), c=qs("btnBackPlayHome"), d=qs("btnBackStoryHome");
    if(a) a.addEventListener("click", function(){ showScreen("levels"); });
    if(b) b.addEventListener("click", function(){ showScreen("story"); refreshMap(); });
    if(c) c.addEventListener("click", function(){ showScreen("home"); });
    if(d) d.addEventListener("click", function(){ showScreen("home"); });
    document.addEventListener("keydown", function(ev){
      const storyVisible = qs("screen-story") && qs("screen-story").classList.contains("visible");
      const bossOpen = qs("bossRoot") && qs("bossRoot").classList.contains("open");
      if(bossOpen) return;
      if(!storyVisible) return;
      if(ev.code==="ArrowRight"||ev.code==="ArrowDown"){
        ev.preventDefault();
        let nxt=walkerIdx+1; while(nxt<6 && !isUnlocked(nxt)) nxt++;
        if(nxt<6){ walkerIdx=nxt; refreshMap(); }
      } else if(ev.code==="ArrowLeft"||ev.code==="ArrowUp"){
        ev.preventDefault();
        let prv=walkerIdx-1; while(prv>=0 && !isUnlocked(prv)) prv--;
        if(prv>=0){ walkerIdx=prv; refreshMap(); }
      } else if(ev.code==="Enter"||ev.code==="Space"){
        ev.preventDefault();
        if(!isUnlocked(walkerIdx)) return;
        if(walkerIdx===5) openBoss();
        else {
          const f=ORDER[walkerIdx];
          if(window.__DPStory&&__DPStory.playFile) window.__DPStory.playFile(f);
        }
      } else if(ev.code==="Escape"){
        showScreen("play");
      }
    });
  }

  let bossRaf=0, bossAC=null, bossKeys={}, bossState=null, bossEls=null, bossRunning=false, touchJoy={x:0,y:0};

  function beep(freq,dur,type,vol,slideTo){
    try{
      if(!bossAC) bossAC=new (window.AudioContext||window.webkitAudioContext)();
      if(bossAC.state==="suspended") bossAC.resume();
      const o=bossAC.createOscillator(), g=bossAC.createGain();
      o.type=type||"square"; o.frequency.value=freq;
      if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1,slideTo), bossAC.currentTime+dur);
      g.gain.value=vol||0.05; o.connect(g); g.connect(bossAC.destination); o.start(); o.stop(bossAC.currentTime+dur);
    }catch(e){}
  }
  function buildBossDOM(){
    const root=qs("bossRoot"); if(!root) return;
    root.innerHTML='<div id="bossStage"><div id="bossHills"></div><div id="bossMeadow"></div><div id="bossWrap"><img id="bossImg" alt="Bristleback"></div><img id="bossCube" alt=""><div id="bossHud"><div class="boss-name">BRISTLEBACK</div><div id="bossBar"><div id="bossFill"></div></div></div><div id="bossHearts"></div><div id="bossHint">WASD / arrows &mdash; move &nbsp;\u2022&nbsp; SPACE / SHOOT &mdash; throw grass &nbsp;\u2022&nbsp; ESC &mdash; quit</div><div id="bossBanner"><h1 id="bossBannerTitle"></h1><p id="bossBannerSub"></p><div id="bossWorld2"></div></div><div id="bossTouch"><div id="bossJoyBase"><div id="bossJoyKnob"></div></div><button id="bossShoot" aria-label="Shoot">\u25CE</button><div id="bossBtns"><button class="bossMoveBtn" id="bossBtnUp">\u25B2</button><div style="display:flex;gap:8px"><button class="bossMoveBtn" id="bossBtnLeft">\u25C0</button><button class="bossMoveBtn" id="bossBtnDown">\u25BC</button><button class="bossMoveBtn" id="bossBtnRight">\u25B6</button></div></div></div></div>';
    qs("bossHills").style.backgroundImage='url("'+BG_HILL+'")';
    qs("bossMeadow").style.backgroundImage='url("'+BG_MEADOW+'")';
    bossEls={
      wrap:qs("bossWrap"), img:qs("bossImg"), cube:qs("bossCube"),
      fill:qs("bossFill"), hearts:qs("bossHearts"), banner:qs("bossBanner"), bTitle:qs("bossBannerTitle"), bSub:qs("bossBannerSub"), world2:qs("bossWorld2")
    };
    bossEls.banner.addEventListener("click", function(){ if(bossState&&bossState.over) resetBoss(); });
    initBossTouch();
    updateBossTouchVisibility();
  }
  function syncBossHud(){
    if(!bossState) return;
    bossEls.fill.style.width=Math.max(0,(bossState.boss.hp/bossState.boss.maxhp)*100)+"%";
    let h=""; for(let i=0;i<3;i++) h+= i<bossState.player.hp ? "&#10084;" : "<span style='opacity:.25'>&#10084;</span>";
    bossEls.hearts.innerHTML=h;
  }
  function flashBoss(el,cls,ms){ el.classList.add(cls); setTimeout(function(){ el.classList.remove(cls); },ms); }
  function dist(ax,ay,bx,by){ return Math.hypot(ax-bx, ay-by); }
  function spawnShot(x,y,vx,vy,friendly){
    const el=document.createElement("img"); el.className="boss-proj"; el.setAttribute("src", F.p1);
    el.style.left=Math.round(x-22)+"px"; el.style.top=Math.round(y-22)+"px";
    qs("bossStage").appendChild(el);
    const o={el:el,x:x,y:y,vx:vx,vy:vy,t:Math.random()*10};
    (friendly?bossState.pshots:bossState.eshots).push(o);
  }
  function endBoss(win){
    bossState.over=true; bossState.win=win;
    bossEls.bTitle.textContent= win ? "BRISTLEBACK DEFEATED!" : "YOU GOT MULCHED";
    bossEls.bSub.textContent= win ? ("Cleared in "+bossState.time.toFixed(1)+"s \u2014 click or R to play again") : "The meadow claims another cube \u2014 click or R to retry";
    if(bossEls.world2) bossEls.world2.textContent= win ? "WORLD 2 COMING SOON" : "";
    bossEls.banner.classList.add("show");
    if(win){
      beep(523,0.12,"square",0.06); beep(659,0.12,"square",0.06); setTimeout(function(){ beep(784,0.2,"square",0.06); },130);
      try{
        const d=getSave(); if(!d.story) d.story={beaten:{}}; d.story.beaten[BOSS_FILE]=true; if(window.__DPStory&&__DPStory.save) __DPStory.save();
      }catch(e){}
      setTimeout(function(){ refreshMap(); }, 600);
    } else { beep(220,0.3,"sawtooth",0.07,70); }
  }
  function setBossFrame(f){ if(bossEls.img.getAttribute("src")!==f) bossEls.img.setAttribute("src",f); }
  function resetBoss(){
    document.querySelectorAll(".boss-proj").forEach(function(el){ el.remove(); });
    const stage=qs("bossStage");
    const W = stage ? stage.clientWidth : 960;
    const H = stage ? stage.clientHeight : 540;
    // start positions proportional to stage
    const px = W*0.77, py=H*0.59, bx=W*0.23, by=H*0.55;
    bossState={ over:false, win:false, time:0, player:{x:px,y:py,hp:3,ifr:0,cd:0,face:-1}, boss:{x:bx,y:by,hp:10,maxhp:10,mode:"chase",t:0,cd:1.4,idleT:0,idleF:0,face:1,dying:0}, pshots:[], eshots:[] };
    if(bossEls){
      bossEls.banner.classList.remove("show"); bossEls.wrap.classList.remove("dying"); bossEls.wrap.style.opacity="1"; bossEls.wrap.style.transform="";
      if(bossEls.world2) bossEls.world2.textContent="";
    }
    syncBossHud();
    const src=currentSkinSrc();
    if(bossEls && bossEls.cube){
      if(bossEls.cube.getAttribute("src")!==src) bossEls.cube.src=src;
      bossEls.cube.style.display="block";
    }
  }
  function getBossBounds(){
    const stage=qs("bossStage");
    const W = stage ? stage.clientWidth : 960;
    const H = stage ? stage.clientHeight : 540;
    // margins proportional to original 960x540: AX0=20 AX1=920 AY0=70 AY1=500
    return { W:W, H:H, AX0:W*0.021, AX1:W*0.958, AY0:H*0.13, AY1:H*0.925 };
  }
  function bossFrame(now){
    bossRaf=requestAnimationFrame(bossFrame);
    const dt=Math.min(0.05,(now-(bossFrame._l||now))/1000); bossFrame._l=now;
    if(!bossRunning || !bossState || bossState.over) return;
    bossState.time+=dt;
    const P=bossState.player, B=bossState.boss;
    const bnd=getBossBounds();
    const AX0=bnd.AX0, AX1=bnd.AX1, AY0=bnd.AY0, AY1=bnd.AY1, W=bnd.W, H=bnd.H;
    let kx=((bossKeys.KeyD||bossKeys.ArrowRight)?1:0)-((bossKeys.KeyA||bossKeys.ArrowLeft)?1:0);
    let ky=((bossKeys.KeyS||bossKeys.ArrowDown)?1:0)-((bossKeys.KeyW||bossKeys.ArrowUp)?1:0);
    // touch joystick adds
    let mx=kx + (touchJoy.x||0);
    let my=ky + (touchJoy.y||0);
    // clamp touch contribution already -1..1, combine and normalize if needed
    if(mx||my){
      const ml=Math.hypot(mx,my);
      const nx=mx/ml, ny=my/ml;
      // scale speed to stage size: base 300 for 960 width -> scale by W/960
      const speed=300 * (W/960);
      P.x=Math.min(AX1,Math.max(AX0,P.x+nx*speed*dt));
      P.y=Math.min(AY1,Math.max(AY0,P.y+ny*speed*dt));
      if(nx) P.face=nx>0?1:-1;
    }
    P.cd-=dt; P.ifr=Math.max(0,P.ifr-dt);
    if(bossEls && bossEls.cube){
      bossEls.cube.style.left=Math.round(P.x-18)+"px"; bossEls.cube.style.top=Math.round(P.y-18)+"px";
      bossEls.cube.classList.toggle("ifr", P.ifr>0);
    }
    if(bossKeys.Space && P.cd<=0){
      P.cd=0.32;
      const a=Math.atan2(B.y-P.y, B.x-P.x);
      const shootSpeed=560*(W/960);
      spawnShot(P.x+Math.cos(a)*24, P.y+Math.sin(a)*24, Math.cos(a)*shootSpeed, Math.sin(a)*shootSpeed, true);
      beep(800,0.06,"square",0.035,1250);
    }
    if(B){
      B.face= P.x>=B.x ? 1 : -1;
      bossEls.wrap.style.transform="scaleX("+B.face+")";
      if(B.mode==="dying"){
        B.dying+=dt; bossEls.wrap.style.opacity=String(Math.max(0,1-B.dying/1.2));
        if(B.dying>1.3) endBoss(true);
      } else if(B.mode==="chase"){
        B.cd-=dt;
        const d=dist(P.x,P.y,B.x,B.y);
        const chaseThresh=170*(W/960);
        const chaseSpeed=115*(W/960);
        if(d>chaseThresh){ B.x+=((P.x-B.x)/d)*chaseSpeed*dt; B.y+=((P.y-B.y)/d)*chaseSpeed*dt; }
        B.idleT+=dt; if(B.idleT>0.3){ B.idleT=0; B.idleF^=1; }
        setBossFrame(B.idleF?F.idle2:F.idle1);
        if(B.cd<=0){ B.mode="windup"; B.t=0; setBossFrame(F.windup); }
      } else if(B.mode==="windup"){
        B.t+=dt; if(B.t>0.45){ B.mode="throwf"; B.t=0; setBossFrame(F.throwf); const a2=Math.atan2(P.y-B.y,P.x-B.x); const eSpeed=330*(W/960); spawnShot(B.x+B.face*55, B.y-10, Math.cos(a2)*eSpeed, Math.sin(a2)*eSpeed, false); beep(500,0.09,"square",0.045,950); }
      } else if(B.mode==="throwf"){ B.t+=dt; if(B.t>0.2){ B.mode="recover"; B.t=0; setBossFrame(F.recover); } }
      else if(B.mode==="recover"){ B.t+=dt; if(B.t>0.5){ B.mode="chase"; B.t=0; B.cd=1.2+Math.random()*0.7; } }
      B.x=Math.min(AX1,Math.max(AX0,B.x)); B.y=Math.min(AY1,Math.max(AY0,B.y));
      bossEls.wrap.style.left=Math.round(B.x-64)+"px"; bossEls.wrap.style.top=Math.round(B.y-64)+"px";
    }
    for(let i=bossState.pshots.length-1;i>=0;i--){
      const s=bossState.pshots[i]; s.t+=dt; s.x+=s.vx*dt; s.y+=s.vy*dt;
      s.el.style.left=Math.round(s.x-22)+"px"; s.el.style.top=Math.round(s.y-22)+"px";
      s.el.setAttribute("src",(Math.floor(s.t/0.07)%2)?F.p2:F.p1);
      if(B && dist(s.x,s.y,B.x,B.y)<42+10 && B.mode!=="dying"){
        B.hp--; const ka=Math.atan2(B.y-P.y,B.x-P.x); B.x=Math.min(AX1,Math.max(AX0,B.x+Math.cos(ka)*26)); B.y=Math.min(AY1,Math.max(AY0,B.y+Math.sin(ka)*26));
        flashBoss(bossEls.img,"flash",120); beep(200,0.12,"sawtooth",0.06,80); syncBossHud();
        s.el.remove(); bossState.pshots.splice(i,1);
        if(B.hp<=0){ B.mode="dying"; B.dying=0; bossEls.wrap.classList.add("dying"); bossEls.wrap.style.transform+=" rotate(90deg)"; bossState.eshots.forEach(function(e){ e.el.remove(); }); bossState.eshots=[]; }
        continue;
      }
      if(s.x<-60||s.x>W+60||s.y<-60||s.y>H+60){ s.el.remove(); bossState.pshots.splice(i,1); }
    }
    for(let j=bossState.eshots.length-1;j>=0;j--){
      const e=bossState.eshots[j]; e.t+=dt; e.x+=e.vx*dt; e.y+=e.vy*dt;
      e.el.style.left=Math.round(e.x-22)+"px"; e.el.style.top=Math.round(e.y-22)+"px";
      e.el.setAttribute("src",(Math.floor(e.t/0.07)%2)?F.p2:F.p1);
      if(P.ifr<=0 && dist(e.x,e.y,P.x,P.y)<12+16){
        P.hp--; P.ifr=1.2; const pa=Math.atan2(P.y-B.y,P.x-B.x); P.x=Math.min(AX1,Math.max(AX0,P.x+Math.cos(pa)*46)); P.y=Math.min(AY1,Math.max(AY0,P.y+Math.sin(pa)*46));
        flashBoss(bossEls.cube,"hurt",180); beep(150,0.2,"sawtooth",0.07,60); syncBossHud();
        e.el.remove(); bossState.eshots.splice(j,1); if(P.hp<=0) endBoss(false); continue;
      }
      if(e.x<-60||e.x>W+60||e.y<-60||e.y>H+60){ e.el.remove(); bossState.eshots.splice(j,1); }
    }
    if(B && B.mode!=="dying" && P.ifr<=0 && dist(P.x,P.y,B.x,B.y)<42+16){
      P.hp--; P.ifr=1.2; const ba=Math.atan2(P.y-B.y,P.x-B.x); P.x=Math.min(AX1,Math.max(AX0,P.x+Math.cos(ba)*70)); P.y=Math.min(AY1,Math.max(AY0,P.y+Math.sin(ba)*70));
      flashBoss(bossEls.cube,"hurt",180); beep(150,0.2,"sawtooth",0.07,60); syncBossHud(); if(P.hp<=0) endBoss(false);
    }
  }

  function isTouchDevice(){ try{ return (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) || ("ontouchstart" in window); }catch(e){ return false; } }
  function updateBossTouchVisibility(){
    const root=qs("bossRoot"); if(!root) return;
    const touch=isTouchDevice() || document.body.classList.contains("touch");
    root.classList.toggle("touch", touch);
    const joy = (function(){ try{ const d=getSave(); return d.touchMode==="joystick"; }catch(e){ return false; } })() || document.body.classList.contains("joystick");
    root.classList.toggle("joy", !!joy);
  }
  function initBossTouch(){
    updateBossTouchVisibility();
    const base=qs("bossJoyBase"), knob=qs("bossJoyKnob"), shoot=qs("bossShoot");
    const btnUp=qs("bossBtnUp"), btnLeft=qs("bossBtnLeft"), btnDown=qs("bossBtnDown"), btnRight=qs("bossBtnRight");
    if(!base) return;
    let activeId=null;
    function setJoy(dx,dy){
      const r=55;
      let len=Math.hypot(dx,dy);
      if(len>r) { dx=dx/len*r; dy=dy/len*r; len=r; }
      knob.style.left="calc(50% + "+dx+"px)";
      knob.style.top="calc(50% + "+dy+"px)";
      touchJoy.x = dx/r;
      touchJoy.y = dy/r;
      if(len<8){ touchJoy.x=0; touchJoy.y=0; }
    }
    function resetJoy(){ knob.style.left="50%"; knob.style.top="50%"; touchJoy.x=0; touchJoy.y=0; activeId=null; }
    base.addEventListener("pointerdown", function(ev){
      ev.preventDefault();
      activeId=ev.pointerId;
      base.setPointerCapture(activeId);
      const rect=base.getBoundingClientRect();
      const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
      setJoy(ev.clientX-cx, ev.clientY-cy);
    });
    base.addEventListener("pointermove", function(ev){
      if(activeId===null || ev.pointerId!==activeId) return;
      const rect=base.getBoundingClientRect();
      const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
      setJoy(ev.clientX-cx, ev.clientY-cy);
    });
    function endJoy(ev){
      if(activeId!==null && ev.pointerId===activeId) resetJoy();
    }
    base.addEventListener("pointerup", endJoy);
    base.addEventListener("pointercancel", endJoy);
    base.addEventListener("lostpointercapture", resetJoy);

    function bindShoot(el){
      if(!el) return;
      el.addEventListener("pointerdown", function(ev){ ev.preventDefault(); bossKeys.Space=true; el.classList.add("on"); });
      const up=function(ev){ bossKeys.Space=false; el.classList.remove("on"); };
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      el.addEventListener("pointerleave", up);
    }
    bindShoot(shoot);

    function bindBtn(el, code){
      if(!el) return;
      el.addEventListener("pointerdown", function(ev){ ev.preventDefault(); bossKeys[code]=true; el.classList.add("on"); });
      const up=function(){ bossKeys[code]=false; el.classList.remove("on"); };
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      el.addEventListener("pointerleave", up);
      el.addEventListener("lostpointercapture", up);
    }
    bindBtn(btnUp, "ArrowUp");
    bindBtn(btnLeft, "ArrowLeft");
    bindBtn(btnDown, "ArrowDown");
    bindBtn(btnRight, "ArrowRight");
    // also allow touch on bossBtns shoot? bossShoot already handles

    // update on mode change
    const obs=new MutationObserver(updateBossTouchVisibility);
    try{ obs.observe(document.body, {attributes:true, attributeFilter:["class"]}); }catch(e){}
    window.addEventListener("resize", updateBossTouchVisibility);
    // also poll touchMode changes via interval? not needed
    document.addEventListener("touchstart", updateBossTouchVisibility, {passive:true});
  }

  function openBoss(){
    const root=qs("bossRoot"); if(!root) return;
    buildBossDOM(); resetBoss();
    root.classList.add("open"); bossRunning=true;
    if(!bossRaf) bossRaf=requestAnimationFrame(bossFrame);
    bossKeys={}; touchJoy={x:0,y:0};
    updateBossTouchVisibility();
  }
  function closeBoss(){
    const root=qs("bossRoot"); if(root) root.classList.remove("open");
    bossRunning=false;
    document.querySelectorAll(".boss-proj").forEach(function(el){ el.remove(); });
    if(bossState) bossState.over=true;
    touchJoy={x:0,y:0};
  }
  window.addEventListener("keydown", function(ev){
    const open = qs("bossRoot") && qs("bossRoot").classList.contains("open");
    if(!open) return;
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(ev.code)>=0) ev.preventDefault();
    bossKeys[ev.code]=true;
    if(ev.code==="KeyR") resetBoss();
    if(ev.code==="Escape"){ closeBoss(); }
  });
  window.addEventListener("keyup", function(ev){ bossKeys[ev.code]=false; });

  window.__DPStory = window.__DPStory || {};
  function ensureDPStory(){
    if(!window.__DPStory) window.__DPStory={};
    if(!window.__DPStory.refresh) window.__DPStory.refresh = function(){ refreshMap(); };
    else {
      const orig=window.__DPStory.refresh;
      window.__DPStory.refresh=function(){ try{orig();}catch(e){} refreshMap(); };
    }
  }

  function reflowMap(){
    const host=qs("storyMap"); if(!host) return;
    const svg=host.querySelector("svg polyline");
    if(svg){ const pts=curPOS().map(function(p){return p.x+","+p.y;}).join(" "); svg.setAttribute("points", pts); }
    const nodes=host.querySelectorAll(".story-node");
    nodes.forEach(function(nd){
      const idx=parseInt(nd.dataset.idx,10);
      const pp=curPOS()[idx];
      if(pp){ nd.style.left=pp.x+"%"; nd.style.top=pp.y+"%"; }
    });
    positionWalker(false);
  }
  function init(){
    wirePlayMenu();
    buildMap();
    buildBossDOM();
    ensureDPStory();
    window.__DPStory.openBoss = openBoss;
    window.__DPStory.closeBoss = closeBoss;
    if(window.__DPStory && !window.__DPStory._storyPatched){
      window.__DPStory._storyPatched=true;
      const origRefresh = window.__DPStory.refresh;
      window.__DPStory.refresh = function(){ try{ if(origRefresh) origRefresh(); }catch(e){} refreshMap(); };
    }
    window.addEventListener("resize", reflowMap);
    window.addEventListener("orientationchange", function(){ setTimeout(reflowMap, 150); });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
