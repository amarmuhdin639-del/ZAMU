import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

const OUT = '/home/z/my-project/public/uploads/products'
const SITE = '/home/z/my-project/public/uploads/site'
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(SITE, { recursive: true })

const STYLE = 'professional streetwear e-commerce product photography, invisible ghost mannequin front view, centered composition, seamless warm light-grey studio background, soft diffused studio lighting, sharp focus, realistic fabric texture, high quality, no text, no watermark, no brand logo, no people'

const JOBS = [
  // [outputPath, size, prompt]
  ['site/hero.jpg', '1440x704', 'cinematic streetwear fashion editorial photograph, young athletic man wearing a classic red and white football soccer jersey and baggy olive cargo pants and sneakers, standing confidently in an urban concrete underground parking garage, dramatic warm evening side lighting, shallow depth of field, premium fashion magazine quality, no text, no watermark, no brand logos'],
  ['site/about.jpg', '1344x768', 'candid lifestyle photograph of three stylish young friends wearing modern streetwear outfits, oversized hoodies baggy pants and football jerseys, laughing together outdoors in an urban plaza at golden hour, warm natural light, authentic joyful mood, premium fashion editorial quality, no text, no watermark, no brand logos'],
  ['site/banner-newdrop.jpg', '1152x864', 'dynamic streetwear fashion photograph, young man in an oversized black football jersey and baggy denim pants mid-motion walking across an urban basketball court, evening light, motion energy, premium fashion editorial, no text, no watermark, no brand logos'],
  ['site/banner-flash.jpg', '1152x864', 'moody streetwear fashion photograph, close-up of a young man wearing a red football jersey under a black bomber jacket, dramatic red and warm orange studio rim lighting on dark background, premium fashion campaign quality, no text, no watermark, no brand logos'],

  ['jersey-red-a.png', '864x1152', `${STYLE}, classic football soccer jersey in bright red with white collar trim, breathable sport fabric with subtle texture`],
  ['jersey-red-b.png', '864x1152', `${STYLE}, classic football soccer jersey in bright red with white collar trim shown from the back, breathable sport fabric with subtle texture`],
  ['jersey-black.png', '864x1152', `${STYLE}, oversized black football soccer jersey with tonal black details and relaxed drape, matte technical fabric`],
  ['jersey-white.png', '864x1152', `${STYLE}, crisp white football soccer jersey with green accent trim on collar and sleeves, breathable sport fabric`],
  ['baggy-olive.png', '864x1152', `professional streetwear e-commerce product photography, baggy wide-leg olive cargo pants with large utility pockets, floating on invisible ghost mannequin legs, centered composition, seamless warm light-grey studio background, soft diffused studio lighting, realistic fabric texture, high quality, no text, no watermark, no brand logo`],
  ['baggy-denim.png', '864x1152', `professional streetwear e-commerce product photography, baggy loose-fit washed black denim jeans, floating on invisible ghost mannequin legs, centered composition, seamless warm light-grey studio background, soft diffused studio lighting, realistic denim texture, high quality, no text, no watermark, no brand logo`],
  ['tee-black.png', '864x1152', `${STYLE}, heavyweight oversized black t-shirt with dropped shoulders and boxy fit, thick cotton jersey fabric`],
  ['tee-white.png', '864x1152', `${STYLE}, heavyweight oversized off-white cream t-shirt with dropped shoulders and boxy fit, thick cotton jersey fabric`],
  ['hoodie-black.png', '864x1152', `${STYLE}, heavyweight oversized black pullover hoodie with kangaroo pocket and thick drawstrings, brushed fleece interior visible at hood`],
  ['hoodie-grey.png', '864x1152', `${STYLE}, heavyweight oversized heather grey zip-up hoodie, brushed fleece, relaxed fit`],
  ['tracksuit-navy.png', '864x1152', `professional streetwear e-commerce product photography, navy blue tracksuit set with track jacket and matching track pants laid flat together, white side stripes, centered composition, seamless warm light-grey studio background, soft diffused studio lighting, realistic tricot fabric texture, high quality, no text, no watermark, no brand logo`],
  ['trackjacket-retro.png', '864x1152', `${STYLE}, retro 90s style track jacket in cream and forest green colorblock with stand collar, shiny tricot fabric`],
  ['shorts-mesh.png', '864x1152', `${STYLE}, long basketball mesh shorts in black with white side stripe, above-knee length, breathable mesh fabric`],
  ['varsity-jacket.png', '864x1152', `${STYLE}, black and cream varsity bomber jacket with wool body leather sleeves and ribbed cuffs`],
  ['coach-jacket.png', '864x1152', `${STYLE}, minimalist sand beige coach jacket with snap buttons and relaxed fit, water-resistant nylon shell`],
  ['cap-black.png', '864x1152', `professional streetwear e-commerce product photography, black curved-brim baseball cap, centered composition, seamless warm light-grey studio background, soft diffused studio lighting, realistic texture, high quality, no text, no watermark, no brand logo`],
  ['crossbody-bag.png', '864x1152', `professional streetwear e-commerce product photography, black nylon crossbody utility shoulder bag with buckle strap, centered composition, seamless warm light-grey studio background, soft diffused studio lighting, realistic texture, high quality, no text, no watermark, no brand logo`],
]

async function main() {
  const only = process.argv.slice(2)
  const zai = await ZAI.create()
  let ok = 0, fail = 0
  for (const [rel, size, prompt] of JOBS) {
    const out = rel.startsWith('site/') ? path.join(SITE, path.basename(rel)) : path.join(OUT, rel)
    if (only.length && !only.some(f => out.includes(f))) continue
    if (fs.existsSync(out) && fs.statSync(out).size > 20000) { console.log(`SKIP ${rel}`); continue }
    let done = false
    for (let a = 1; a <= 3 && !done; a++) {
      try {
        const res = await zai.images.generations.create({ prompt, size })
        const b64 = res?.data?.[0]?.base64
        if (!b64) throw new Error('empty response')
        fs.writeFileSync(out, Buffer.from(b64, 'base64'))
        console.log(`OK ${rel} (${Math.round(fs.statSync(out).size / 1024)} KB)`)
        ok++; done = true
      } catch (e) {
        console.error(`FAIL ${rel} attempt ${a}: ${e.message}`)
        await new Promise(r => setTimeout(r, 4000 * a))
        if (a === 3) fail++
      }
    }
  }
  console.log(`DONE ok=${ok} fail=${fail}`)
}
main().catch(e => { console.error('FATAL', e); process.exit(1) })
