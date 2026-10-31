// A deliberately tiny multilayer perceptron (5 → 4 → 1) trained in the browser
// with plain gradient descent. It exists to make inference visible, not to be a
// useful model: 15 synthetic samples cannot support real generalisation.

export interface Network {
  w1: number[][] // [hidden][input]
  b1: number[]
  w2: number[] // [hidden]
  b2: number
}

export interface Trace {
  input: number[]
  hiddenPre: number[]
  hidden: number[]
  outputPre: number
  output: number
}

const relu = (x: number) => Math.max(0, x)
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function initNetwork(inputs: number, hidden: number, seed = 42): Network {
  const r = rng(seed)
  const scale = Math.sqrt(2 / inputs)
  return {
    w1: Array.from({ length: hidden }, () => Array.from({ length: inputs }, () => (r() * 2 - 1) * scale)),
    b1: Array.from({ length: hidden }, () => 0.05),
    w2: Array.from({ length: hidden }, () => (r() * 2 - 1) * scale),
    b2: 0,
  }
}

export function forward(net: Network, input: number[]): Trace {
  const hiddenPre = net.w1.map((row, j) => row.reduce((s, w, i) => s + w * input[i]!, net.b1[j]!))
  const hidden = hiddenPre.map(relu)
  const outputPre = hidden.reduce((s, h, j) => s + h * net.w2[j]!, net.b2)
  return { input, hiddenPre, hidden, outputPre, output: sigmoid(outputPre) }
}

/** Binary cross-entropy averaged over the dataset. */
export function loss(net: Network, xs: number[][], ys: number[]): number {
  const eps = 1e-9
  return (
    xs.reduce((s, x, i) => {
      const p = forward(net, x).output
      return s - (ys[i]! * Math.log(p + eps) + (1 - ys[i]!) * Math.log(1 - p + eps))
    }, 0) / xs.length
  )
}

export function train(
  xs: number[][],
  ys: number[],
  { hidden = 4, epochs = 600, lr = 0.5, seed = 42 } = {},
): { net: Network; history: number[] } {
  const net = initNetwork(xs[0]!.length, hidden, seed)
  const history: number[] = []
  for (let epoch = 0; epoch < epochs; epoch++) {
    const gw1 = net.w1.map((row) => row.map(() => 0))
    const gb1 = net.b1.map(() => 0)
    const gw2 = net.w2.map(() => 0)
    let gb2 = 0
    xs.forEach((x, n) => {
      const t = forward(net, x)
      const dOut = t.output - ys[n]! // dL/dz for sigmoid + BCE
      gb2 += dOut
      t.hidden.forEach((h, j) => {
        gw2[j]! += dOut * h
        const dh = t.hiddenPre[j]! > 0 ? dOut * net.w2[j]! : 0
        gb1[j]! += dh
        x.forEach((xi, i) => (gw1[j]![i]! += dh * xi))
      })
    })
    const m = xs.length
    net.w1.forEach((row, j) => row.forEach((_, i) => (row[i]! -= (lr * gw1[j]![i]!) / m)))
    net.b1.forEach((_, j) => (net.b1[j]! -= (lr * gb1[j]!) / m))
    net.w2.forEach((_, j) => (net.w2[j]! -= (lr * gw2[j]!) / m))
    net.b2 -= (lr * gb2) / m
    if (epoch % 20 === 0 || epoch === epochs - 1) history.push(loss(net, xs, ys))
  }
  return { net, history }
}
