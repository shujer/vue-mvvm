const isObject = obj => {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

CompileUtil = {
  text(node, expr, vm) {
    //将节点的文本内容替换成实际表达式的值
    let fn = this.updater['text']
    let content = this.getTextVal(vm, expr)
    expr.replace(/\{\{\s+(.+?)\s+\}\}/g, (...args) => {
      new Watcher(vm, args[1], newExpr => {
        let newVal = this.getTextVal(vm, newExpr)
        fn && fn(node, newVal)
      })
    })
    fn && fn(node, content)
  },
  model(node, expr, vm) {
    //将表单元素的值替换成实际表达式的值
    let fn = this.updater['model']
    // 数据更新调用
    new Watcher(vm, expr, newVal => {
      fn && fn(node, newVal)
    })
    //双向绑定
    if (!node.oninput) {
      node.oninput = event => {
        let value = event.target.value // 获取用户输入的内容
        this.setValue(vm, expr, value)
      }
    }
    let value = this.getVal(vm, expr)

    fn && fn(node, value)
  },
  html(node, expr, vm) {
    //将插入html文本
    let fn = this.updater['html']
    let value = this.getVal(vm, expr)
    new Watcher(vm, expr, newExpr => {
      fn && fn(node, newExpr)
    })
    fn(node, value)
  },
  // 根据表达式取到对应的数据 a.b.c
  getVal(vm, expr) {
    // 解析a.b.c
    return expr.split('.').reduce((data, current) => {
      return data[current]
    }, vm.$data)
  },
  setValue(vm, expr, value) {
    expr.split('.').reduce((data, current, index, arr) => {
      if (index == arr.length - 1) {
        return (data[current] = value)
      }
      return data[current]
    }, vm.$data)
  },
  getTextVal(vm, expr) {
    return expr.replace(/\{\{\s+(.+?)\s+\}\}/g, (...args) => {
      return this.getVal(vm, args[1])
    })
  },
  getDirectiveType(attrName) {
    //v-指令语法,可能有其他表达式，函数，对象的情况，这里不考虑
    let [, direactive] = attrName.split('-')
    return direactive
  },
  updater: {
    text(node, value) {
      node.textContent = typeof value === 'undefined' ? '' : value
    },
    model(node, value) {
      node.value = typeof value === 'undefined' ? '' : value
    },
    html(node, value) {
      node.innerHTML = typeof value === 'undefined' ? '' : value
    },
    attr(node, value, attr) {
      //...提取属性操作
      node.setAttribute(attr, ret)
    }
  }
}
