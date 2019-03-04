class Dep {
  constructor() {
    this.subs = [] // 存放所有Watcher
  }
  //订阅
  addSub(watcher) {
    this.subs.push(watcher)
  }
  //发布
  notify() {
    this.subs.forEach(watcher => {
      watcher.update()
    })
  }
}
// 观察者（发布订阅）
class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm
    this.expr = expr
    this.cb = cb
    this.oldValue = this.get()
  }
  get() {
    let value = CompileUtil.getVal(vm, expr)
    return value
  }
  update() {
    //更新操作，数据变化后
    let newVal = CompileUtil.getVal(vm, expr)
    if (newVal !== this.oldValue) {
      this.cb(newVal)
    }
  }
}

class Compiler {
  constructor(el, vm) {
    this.el = el && el.nodeType == 1 ? el : document.querySelector(el)
    this.vm = vm
    let fragment = this.node2fragment(this.el)
    this.el.appendChild(fragment)
    this.compile(fragment)
  }
  //核心编译方法
  compile(node) {
	let childNodes = node.childNodes;
	console.log(childNodes)
    [...childNodes].forEach(child => {
      if (this.isElementNode(child)) {
        console.log('element', child)
        this.compileElement(child)
        //如果是元素遍历
        this.compile(child)
      } else {
        console.log('text', child)
      }
    })
  }
  isDirective(attrName) {
    return attrName.startsWith('v-')
  }
  //编译元素
  compileElement(node) {
    let attributes = node.attributes
    ;[...attributes].forEach(attr => {
      let {name, value: expr} = attr
      if (this.isDirective(name)) {
        let [, directive] = name.split('-')
        CompileUtil[directive](node, expr, this.vm)
      }
    })
  }
  // 编译文本
  compileText(node) {
    let content = node.textContent
    if (/\{\{(.+?)\}\}/.test(content)) {
      CompileUtil['text'](node, content, this.vm)
    }
  }
  node2fragment(node) {
    let fragment = document.createDocumentFragment()
    let firstChild
    while ((firstChild = node.firstChild)) {
      fragment.appendChild(firstChild)
    }
    return fragment
  }
}

CompileUtil = {
  // 根据表达式取到对应的数据
  getVal(vm, expr) {
    return expr.split('.').reduce((data, current) => {
      return data[current]
    }, vm.$data)
  },
  model(node, expr, vm) {
    let fn = this.updater['modelUpdater']
    new Watcher(vm, expr, newVal => {
      fn(node, value)
    })
    let value = this.getVal(vm, expr)
    fn(node, value)
  },
  html() {},
  text(node, expr, vm) {
    let fn = this.updater['textUpdater']
    let content = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      new Watcher(vm, args[1], newVal => {
        fn(node, value)
      })
      return this.getVal(vm, args[1])
    })
    fn(node.content)
  },
  updater: {
    modelUpdater(node, value) {
      node.value = value
    },
    htmlUpdater() {},
    textUpdater(node, value) {}
  }
}

class Observer {
  //实现数据劫持
  constructor(data) {
    this.observer(data)
  }
  observer(data) {
    //如果是对象才观察
    if (data && typeof data == 'object') {
      //如果是对象
      for (let key in data) {
        this.defineReactive(data, key, data[key])
      }
    }
  }
  defineReactive(obj, key, value) {
    Object.defineProperty(obj, key, {
      get() {
        return value
      },
      set(newVal) {
        if (newVal != value) {
          this.observer(newVal)
          value = newVal
        }
      }
    })
  }
}

class Vue {
  constructor(options) {
    this.$el = options.el
    this.$data = options.data
    if (this.$el) {
      new Observer(this.data)
      new Compiler(this.$el, this)
    }
  }
}
