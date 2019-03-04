> Vue源码是用TypeScript写的，本文采用ES6写法逐步实现MVVM框架，以理清双向绑定的过程。代码参考姜文老师的公开课

#### 分析
数据双向绑定的过程可以分成两个过程：① 数据变化渲染到页面；② 页面操作（input/textarea等表单）导致数据更改。    
因此，我们要实现这两个方面，首先要有一个能够解析模板，分析模板中用到的数据替换成实际值的Compile类；其次，需要一个能观察数据变化的Observer类；接着，数据变化要怎么自动更新视图呢？这就需要一个Watcher类。最后，一个数据可能有多个Watcher订阅，我们需要一个Dep类来实现发布订阅，管理Watcher

#### 实例
- 测试html
```html
<body>
  <div id="app">
    <input type="text" v-model="info.name" />
    <div>{{ info.name }} {{ info.age }}</div>
    <div>
      <ul>
        <li>{{ info.name }}</li>
        <li>{{ info.age }}</li>
      </ul>
  </div>
  <div v-html="html"></div>
  </div>
<script src="MVVM/Compile.js"></script>
<script src="MVVM/Observer.js"></script>
<script src="MVVM/Watcher.js"></script>
<script src="MVVM/Dep.js"></script>
<script src="MVVM/index.js"></script>
  <script>
    var vm = new Vue({
      el: '#app',
      data: {
        info: {
          name: 'Susie',
          age: 24
        },
        html: '这是html文本'
      }
  })
  </script>
</body>
```

#### Vue类
```javascript
class Vue {
  constructor(options) {
    this.$options = options
    this.$data = options.data
    this.$el = options.el
    if (this.$el) {
      //编译模板，渲染到页面
      new Compile(this, this.$el)
    }
  }
}
```

#### Compile类实现
我们知道，Vue内置了需要便于操作的内置指令，本文只是为了概览MVVM过程，因此只分析`v-model`、`v-html`和模板语法
- 起步：我们需要用到Vue实例中的数据来渲染页面，因此将Vue实例和挂载到的元素传入Compile类
```javascript
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
  compile(node) {}
}
```
- 为了减少回流重绘影响性能，我们编写一个`node2fragment`函数，把DOM对象保存到内存中，编译结束再挂载回根节点
```javascript
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
```
- 开始编译
```javascript
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
      //递归遍历元素节点
      this.compile(child)
    } else if (child.nodeType == 3) {
      //文本指令需要，解析文本
      this.compileText(child)
    }
  })
}
```
- 对于元素节点，需要解析指令
```javascript
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
```
- 对于文本节点，需要解析模板
```javascript
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
```
- 我们定义一个全局的CompileUtil工具类，用于处理渲染工作
```javascript
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
```
