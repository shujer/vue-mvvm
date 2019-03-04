class Observer {
  constructor(data) {
    this.observe(data)
  }
  observe(data) {
    if (data && isObject(data)) {
      Object.keys(data).forEach(key => {
        this.defineReactive(data, key, data[key])
        this.observe(data[key]) //递归劫持
      })
    }
  }
  /**
   * @param {Object} obj
   * @param {String | Number} key
   * @param {any} value
   * @description 定义响应式
   */
  defineReactive(obj, key, value) {
    let self = this
    let dep = new Dep()
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get() {
        //取值
        Dep.target && dep.addSub(Dep.target)
        return value
      },
      set(newVal) {
        //设置值
        if (newVal != value) {
          self.observe(newVal)
          value = newVal
          dep.notify()
        }
      }
    })
  }
}

class Dep {
  constructor() {
      this.subs = []
  }
  addSub(watcher) {
      this.subs.push(watcher)
  }
  notify() {
      this.subs.forEach(watcher => watcher.update())
  }
}