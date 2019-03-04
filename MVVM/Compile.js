// 模板类，负责解析指令、文本、模板语法等
class Compile {
  constructor(vm, el) {
    this.vm = vm
    this.el = this.isElementNode(el) ? el : document.querySelector(el)
    let fragment = this.node2fragment(this.el)
    this.compile(fragment)
    this.el.appendChild(fragment)
  }
  /**
   * @description 判断节点类型
   */
  isElementNode(node) {
    return node.nodeType === 1
  }
  isTextNode(node) {
    return node.nodeType === 3
  }
  /**
   * @param {Element} node
   * @description 递归遍历元素/文本节点
   */
  compile(node) {
    let [...childNodes] = node.childNodes
    childNodes.forEach(child => {
      if (this.isElementNode(child)) {
        //元素类型，需要解析指令
        this.compileElement(child)
        this.compile(child)
      } else if (this.isTextNode(child)) {
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
        CompileUtil[directive](node, expr, this.vm)
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

