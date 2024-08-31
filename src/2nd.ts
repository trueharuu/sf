export const secondpc = `tiol=ie9|ilet|ilt2o2|il2to2
tioj=ie9|itej|it2jo2|itj2o2
tios=|e6t|e3s2t3o2|e2s2i4o2
tioz=|e3t|o2t3z2|o2i4z2e2
itsz=|e2z2|eetz2s2|et3s2i4
itls=|e2l|l3e2s2t|i4s2t3e
itjz=|e7j|e2tz2e2j3|et3z2i4
itlz=e9i|e4le3ti|e4lz2t2i|e4l2z2ti
itjs=e9i|e4te3ji|e4t2s2ji|e4ts2j2i
otsz=|e3z|o2z2s2t|o2zs2t3e2
otls=|e2l|o2le2s2t|o2l2s2t3e
otjz=|e7j|e2tz2e2jo2|et3z2j2o2
otlz=e7t|e4let2|e4lz2to2|e4l2z2o2
otjs=e4t|e4t2ej|e4ts2jo2|e4s2j2o2
tlsz=e9z|e4te3z2|e4t2s2zl|e4ts2l3
tjsz=s|s2e3t|jsz2t2|j3z2te4
itlj=e9j|e4lete2j|e4lt3j2|e4l2i4
otlj=le5j|le2te2jo2|l2t3j2o2e
tljs=|e3l|jl3s2t|j3s2t3e2
tljz=|e3l|jl3tz2|j3t3z2e2
iolj=|e4lo2j|e4lo2j3|e4l2i4
iosz=i|ie3z|io2z2s2|io2zs2e4
iols=e9i|e5s2e2i|e4s2lo2i|e4l3o2i
iojz=e9i|e5zje2i|e4z2jo2i|e4zj2o2i
iolz=e9i|e5z2e2i|e4o2z2li|e4o2l3i
iojs=e7j|e5s2j|e4s2j2o2|e4i4o2
iljs=i|ie3l|ijl3s2|ij3s2e4
iljz=e9i|e5je3i|e3z2j3li|e4z2l3i
ilsz=|e2le2s|l3z2s2|i4z2se3
ijsz=|e3eze2j|e3z2s2j3|e3zs2i4
oljs=|e4j2s2|e4js2lo2|e4jl3o2
oljz=|e4z2l2|e4jz2lo2|e4j3lo2
olsz=|e2le2s|o2lz2s2|o2l2z2se3
ojsz=e5ze2j|e4z2s2jo2|e4zs2j2o2
ljsz=|e6ze2j|e4lz2s2j|e2l3zs2j2`;

export function find_2nd(queue: string) {
  return secondpc
    .split('\n')
    .map(x => x.split('='))
    .find(
      x => x[0].split('').sort().join('') === queue.split('').sort().join(''),
    );
}
