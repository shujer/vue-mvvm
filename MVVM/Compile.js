// 模板类，负责解析指令、文本、模板语法等
class Compile {
  constructor(vm, el) {
    this.vm = vm
    this.el = document.querySelector(el)
    let fragment = this.node2fragment(this.el)
    this.compile(fragment)
    this.el.appendChild(fragment)
  }
  /**
   * @param {Element} node 
   * @description 递归遍历元素/文本节点
   */
  compile(node) {
    let [...childNodes] = node.childNodes
    childNodes.forEach(child => {
      if (child.nodeType == 1) {
        //元素类型，需要解析指令
        this.compileElement(child)
        this.compile(child)
      } else if (child.nodeType == 3) {
        //文本指令需要，解析文本
        this.compileText(child)
      }
    })
  }
  /**
   * @param {Element} node 
   * @description 提取指令中的变量进行编译
   */
  compileElement(node) {
    let [...attributes] = node.attributes
    attributes.forEach(attr => {
      let {name, value: expr} = attr
      if (this.isDirective(name)) {
        let directive = CompileUtil.getDirectiveType(name)
        CompileUtil[directive](node, expr, this.vm, name)
      }
    })
  }
  /**
   * @param {Element} node 
   * @description 提取{{}}中的变量进行编译
   */
  compileText(node) {
    let content = node.textContent
    if (/\{\{(.+?)\}\}/.test(content)) {
      CompileUtil['text'](node, content, this.vm)
    }
  }
  /**
   * @param {string} attr 
   * @description 判断是否为v-指令
   */
  isDirective(attr) {
    return /^v\-/.test(attr)
  }
  /**
   * @param {Element} node 
   * @description 将节点保存在DocumentFragment中进行操作，减少回流重绘
   */
  node2fragment(node) {
    let firstChild = node.firstChild,
      fragment = document.createDocumentFragment()
    while (firstChild) {
      fragment.appendChild(firstChild)
      firstChild = node.firstChild
    }
    return fragment
  }
}
/**
 * refer: https://github.com/a1427179172/proxy-vue/proxy-vue/src/dom.js
 */
CompileUtil = {
  text(node, expr, vm) {//将节点的文本内容替换成实际表达式的值
    let fn = this.updater['text']
    let content = expr.replace(/\{\{\s+(.+?)\s+\}\}/g, (...args) => {
      return this.getVal(vm, args[1])
    })
    fn(node, content)
  },
  model(node, expr, vm) {//将表单元素的值替换成实际表达式的值
    let fn = this.updater['model']
    let value = this.getVal(vm, expr)
    fn(node, value)
  },
  html(node, expr, vm) {//将插入html文本
    let fn = this.updater['html']
    let value = this.getVal(vm, expr)
    fn(node, value)
  },
  // 根据表达式取到对应的数据 a.b.c
  getVal(vm, expr) {
    // 解析a.b.c
    return expr.split('.').reduce((data, current) => {
      return data[current]
    }, vm.$data)
  },
  getDirectiveType(attrName) {
    //v-指令语法
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
