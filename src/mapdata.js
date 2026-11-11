// Loads public/map.json and unpacks it.
// In the file every outline ("ring") is packed small: whole numbers in hundredths of a
// degree, each point stored as the step from the previous one. Here each ring becomes
// a plain list [lon, lat, lon, lat, ...] in degrees, ready to draw.
function unpack(ring) {
  const out = new Float32Array(ring.length);
  let x = 0, y = 0;
  for (let i = 0; i < ring.length; i += 2) {
    x += ring[i];
    y += ring[i + 1];
    out[i] = x / 100;
    out[i + 1] = y / 100;
  }
  return out;
}

export async function loadMap(url) {
  const raw = await fetch(url).then((response) => response.json());
  const eras = {};
  for (const [id, era] of Object.entries(raw.eras)) eras[id] = { bbox: era.bbox, rings: era.rings.map(unpack) };
  return {
    world: raw.world.map(unpack),
    countries: raw.countries.map((country) => ({
      name: country.name,
      rings: country.rings.map(unpack),
      label: country.label && { lon: country.label[0], lat: country.label[1], room: country.label[2] },
    })),
    eras,
  };
}
