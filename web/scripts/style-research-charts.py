from pathlib import Path
import numpy as np
from PIL import Image
r=Path(__file__).resolve().parents[1];a=r/'public/assets'
# Recolour only existing coloured marks, keeping their pixel coverage and all coordinates.
im=np.array(Image.open(a/'research-transport.png').convert('RGB'));out=im.copy();bg=np.array([255,250,245.]);bases=np.array([[163,122,76],[92,131,174],[197,87,34],[85,88,201],[138,210,66],[236,133,124]],float)
new=np.array([[119,119,119],[69,108,141],[170,118,47],[116,91,141],[75,122,90],[163,55,77]],float)
p=im.astype(float);best=np.full(im.shape[:2],1e9);idx=np.zeros(im.shape[:2],int);cover=np.zeros(im.shape[:2])
for i,c in enumerate(bases):
 v=c-bg;alpha=np.clip(((p-bg)*v).sum(2)/(v*v).sum(),0,1);dist=np.linalg.norm(p-(bg+alpha[:,:,None]*v),axis=2);sel=dist<best;idx[sel]=i;best[sel]=dist[sel];cover[sel]=alpha[sel]
mask=(best<45)&(cover>.04)&((im.max(2).astype(int)-im.min(2))>18)
for i,c in enumerate(new):
 m=mask&(idx==i);out[m]=np.clip(bg+cover[m,None]*(c-bg),0,255).astype('uint8')
Image.fromarray(out).save(a/'research-transport-styled.png')
# Bar interiors come from original black marks; labels, axes and error bars remain untouched.
im=np.array(Image.open(a/'research-glp1.png').convert('RGB'));out=im.copy();colors=['#777777','#a398bd','#745b8d','#8cae96','#4b7a5a','#cc8c99','#a3374d','#456c8d']
xs=[(52,69),(78,95),(104,121),(130,147),(156,173),(182,199),(208,225),(234,252)]
ys=[126,77,69,67,54,77,54,29]
for (x1,x2),y1,col in zip(xs,ys,colors):
 c=np.array([int(col[j:j+2],16) for j in [1,3,5]])
 reg=im[y1:155,x1:x2];black=(reg.max(2)<100);v=reg[black].mean(1)/255
 out[y1:155,x1:x2][black]=(c[None,:]*(1-v[:,None])+bg[None,:]*v[:,None]).astype('uint8')
Image.fromarray(out).save(a/'research-glp1-styled.png')
