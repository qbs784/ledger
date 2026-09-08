// A teammate added this while you were rebasing. It is only on origin.
export function unslugify(slug) {
  return slug.split("-").join(" ")
}
