if (typeof process !== 'undefined' && process.env) {
  for (const key in process.env) {
    if (typeof process.env[key] === 'string') {
      process.env[key] = process.env[key]!
        .replace(/[\r\n]/g, '')
        .replace(/^["']|["']$/g, '')
        .trim();
    }
  }
}
