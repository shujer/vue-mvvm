const hasProperty = (obj, prop) => {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}

const isObject = obj => {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

const isFunction = obj => {
  return typeof obj === 'function'
}

const isString = obj => {
  return typeof obj === 'string'
}

const toCamelCase = str => {
  return str.replace(/\-(\w)/g, (all, letter) => letter.toUpperCase)
}

const toKebabCase = str => {
  return str.replace(/[A-Z]/g, letter => `-${letter}`).toLowerCase()
}

const foreach = (obj, fn) => {
  const keys = Object.keys(obj)
  let ret
  console.log(keys)
  if (!keys.length) {
    return
  }

  for (let key of keys) {
    ret = fn.call(obj, obj[key], key)

    // 当返回false时，终止循环
    if (!ret) {
      break
    }
  }
}
