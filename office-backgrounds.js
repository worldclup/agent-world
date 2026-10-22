// Surroundings use the same native canvas pixels as the office, at its current elevation.
function drawOfficeSurroundings(t, p) {
  const {w,h}=VIEW, day=lighting.daylight;
  ctx.save();ctx.translate(VIEW.x,VIEW.y);
  const tree=(x,y,s=1)=>{
    rect(x-2*s,y,4*s,12*s,p.trim);
    rect(x-10*s,y-9*s,20*s,12*s,p.leaf);
    rect(x-7*s,y-16*s,14*s,9*s,p.leaf);
    rect(x-5*s,y-13*s,6*s,6*s,p.accent+'35');
  };
  const house=(x,y,width,height,i)=>{
    const depth=12;
    poly([[x,y],[x+width,y],[x+width,y+height],[x,y+height]],p.near);
    poly([[x+width,y],[x+width+depth,y-7],[x+width+depth,y+height-7],[x+width,y+height]],p.far);
    poly([[x-4,y],[x+width/2,y-17],[x+width+4,y],[x+width,y+4],[x,y+4]],p.roof);
    poly([[x+width/2,y-17],[x+width/2+depth,y-24],[x+width+depth+4,y-7],[x+width+4,y]],p.trim);
    for(let n=0;n<2;n++){
      rect(x+6+n*(width-14),y+9,7,9,p.trim);
      rect(x+7+n*(width-14),y+10,5,6,day<.45?p.accent:p.sky);
    }
    rect(x+width/2-3,y+height-13,7,13,p.trim);
    if(i%2===0){rect(x+4,y-3,width-8,2,p.accent+'80');tree(x+width+21,y+height-7,.7);}
  };
  const tower=(x,y,width,height,depth,i)=>{
    poly([[x,y-height],[x+width,y-height],[x+width,y],[x,y]],p.near);
    poly([[x+width,y-height],[x+width+depth,y-height-depth/2],[x+width+depth,y-depth/2],[x+width,y]],p.far);
    poly([[x,y-height],[x+depth,y-height-depth/2],[x+width+depth,y-height-depth/2],[x+width,y-height]],p.roof);
    rect(x+5,y-height-4,width-10,4,p.trim);
    for(let row=0;row<Math.floor((height-10)/12);row++){
      rect(x,y-height+8+row*12,width,1,p.trim+'70');
      for(let col=0;col<Math.floor((width-6)/9);col++){
        const lit=(row*7+col*3+i)%5===0;
        rect(x+4+col*9,y-height+4+row*12,5,6,day<.5&&lit?p.accent:p.sky);
      }
    }
    rect(x+width-1,y-height,1,height,p.trim);
    if(buildingTheme==='cyber'&&height>15)rect(x+width+2,y-height+9,2,Math.min(30,height-15),p.accent);
  };
  if(officeLayout==='home'){
    // A low horizon and two staggered streets place the room inside a leafy neighborhood.
    rect(0,43,w,h-43,p.base);
    for(let i=0;i<14;i++)tree(i*w/13,50+(i%3)*5,.65);
    rect(0,102,w,24,p.far);rect(0,105,w,2,p.trim);
    for(let x=0;x<w;x+=32)rect(x,115,15,1,p.accent+'90');
    for(let i=0;i<Math.ceil(w/72)+1;i++)house(i*72-15,73+(i%2)*6,39,28,i);
    rect(0,171,w,37,p.far);rect(0,174,w,3,p.trim);
    for(let x=5;x<w;x+=45)rect(x,188,19,2,p.accent+'80');
    for(let i=0;i<Math.ceil(w/101)+1;i++){
      const x=i*101-27,y=139+(i%2)*9;
      house(x,y,53,34,i+3);tree(x+76,y+13,1.1);
      rect(x-4,y+35,73,2,p.trim);
      for(let n=0;n<7;n++)rect(x+n*11,y+29,2,8,p.trim);
    }
    // The near trees remain visible along the edges of the open-sided building.
    for(let i=0;i<4;i++){tree(12+(i%2)*29,233+i*49,1.35);tree(w-13-(i%2)*27,247+i*51,1.2);}
  }else if(officeLayout==='medium'){
    rect(0,42,w,h-42,p.base);
    for(let i=0;i<Math.ceil(w/43)+1;i++){
      const height=23+(i*17)%37;
      rect(i*43-8,83-height,31,height,p.far);
      rect(i*43-5,81-height,25,2,p.trim+'70');
    }
    // Eye-level transit passes behind neighboring buildings, visible through their gaps.
    for(let x=24;x<w;x+=72)rect(x,110,5,38,p.trim);
    rect(0,104,w,8,p.trim);rect(0,104,w,2,p.roof);
    const trainX=((t/130)%(w+164))-132;
    for(let car=0;car<4;car++) {
      const x=trainX+car*29;
      rect(x,91,27,13,p.near);rect(x,90,27,2,p.roof);
      rect(x,101,27,2,p.accent);
      for(let window=0;window<4;window++)rect(x+3+window*6,94,4,5,day<.5?p.accent:p.sky);
      rect(x+13,93,1,8,p.trim);
      if(car===3)rect(x+26,97,1,3,day<.5?'#fff2c6':p.sky);
    }
    rect(0,103,w,1,p.roof);
    // Rooftops sit below us; a few neighboring towers still rise above this floor.
    const neighbors=[[-20,191,57,118,20],[62,154,47,82,18],[145,134,54,68,20],
      [245,148,61,112,22],[354,133,49,75,17],[446,162,55,109,20],[548,193,63,137,23]];
    neighbors.forEach(([x,y,bw,bh,d],i)=>tower(x*w/600,y,bw,bh,d,i));
    for(let i=0;i<5;i++){
      const x=i%2?w-43: -13,y=225+Math.floor(i/2)*86;
      tower(x,y,46,58,18,i+11);
      rect(x+13,y-64,12,6,p.trim);rect(x+15,y-66,8,2,p.roof);
    }
    if(day<.45)rect(0,89,w,1,p.accent+'35');
  }else{
    // Thirty floors up: rooftops and streets, not a street-level wall of towers.
    rect(0,36,w,h-36,p.base);
    for(let i=0;i<Math.ceil(w/21)+1;i++){
      const height=4+(i*13)%15;
      rect(i*21-3,52-height,15,height,p.far);
    }
    // A river cuts through the distant city, widening toward the observer.
    poly([[w*.64,49],[w*.69,49],[w*.46,149],[w*.34,226],[w*.16,h],[w*.04,h],[w*.23,215],[w*.39,136]],p.sky);
    // Elevated railway is painted before nearby rooftops so buildings hide the train.
    const railY=x=>92+x*.085;
    const railPanel=(x,y,width,height,color)=>poly([[x,railY(x)+y],[x+width,railY(x+width)+y],[x+width,railY(x+width)+y+height],[x,railY(x)+y+height]],color);
    for(let x=16;x<w;x+=54)rect(x,railY(x)+5,3,13,p.trim);
    railPanel(0,0,w,6,p.trim);
    railPanel(0,0,w,2,p.roof);
    railPanel(0,3,w,1,p.accent+'80');
    const trainX=((t/180)%(w+108))-84;
    for(let car=0;car<4;car++) {
      const x=trainX+car*17;
      railPanel(x,-5,16,5,p.near);
      railPanel(x,-6,16,1,p.roof);
      railPanel(x,-1,16,1,p.accent);
      for(let window=0;window<4;window++)railPanel(x+2+window*3,-4,2,2,day<.5?p.accent:p.sky);
      if(car===3)railPanel(x+15,-3,1,2,day<.5?'#fff2c6':p.sky);
    }
    for(let row=0;row<7;row++){
      const y=62+row*38, size=13+row*3;
      for(let col=-1;col<Math.ceil(w/58)+1;col++){
        const x=col*58+(row%2)*27;
        const riverX=w*.665-(y-49)*.84;
        if(Math.abs(x-riverX)<30+row*3)continue;
        const height=5+(row*7+col*11+33)%17;
        tower(x,y+height,size,height,7+row*2,row*9+col);
        if((col+row)%4===0)rect(x+3,y-3,size-6,3,p.trim);
      }
    }
    for(let row=0;row<6;row++){
      const y=82+row*38;
      rect(0,y,w,4,p.far+'b0');
      for(let col=0;col<12;col++)rect(col*w/12+row*3,y+1,2,1,day<.5?p.accent:p.trim);
    }
    // A distant road bridge crosses the river below the railway.
    rect(w*.38,119,w*.22,3,p.trim);rect(w*.42,116,w*.16,1,p.accent+'80');
  }
  ctx.restore();
}
