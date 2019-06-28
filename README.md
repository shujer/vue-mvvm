
> 本文采用ES6写法逐步实现MVVM框架，以理清双向绑定的过程。

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
![初始效果](/img/in-post/mvvm-01.JPG)

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
    // 解析a.b.c,可能有其他表达式，函数，对象的情况，这里不考虑
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
此时，我们的页面已经可以显示了
![Compile实现之后](/img/in-post/mvvm-02.JPG)

#### Observer类实现
- 在模板编译前，我们要进行数据劫持，修改Vue类
```javascript
if (this.$el) {
  //数据劫持
  new Observer(this.$data)
  //编译模板，渲染到页面
  new Compile(this, this.$el)
}
```
- 实现Observer类
```javascript
const isObject = obj => {
  return Object.prototype.toString.call(obj) === '[object Object]'
}
const isObject = obj => {
  return Object.prototype.toString.call(obj) === '[object Object]'
}
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
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get() {
        //取值
        return value
      },
      set(newVal) {
        //设置值
        if (newVal != value) {
          self.observe(newVal)
          value = newVal
        }
      }
    })
  }
}
```
此时，我们已经完成了数据劫持，但是数据改变怎么自动更新视图呢？我们需要给变化的数据添加一个观察者，绑定一个回调函数，自动调用
#### Watcher类实现
```javascript
class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm
    this.expr = expr
    this.cb = cb
    this.value = this._getVal()
  }
  _getVal() {
    let value = CompileUtil.getVal(this.vm,this.expr);
    return value;
  }
  //数据更新调用
  update() {
    let newVal = this._getVal(this.vm, this.expr)
    let oldVal = this.value
    if (newVal !== oldVal) {
      this.cb(newVal)
    }
  }
}
```
我们什么时候需要实例化一个Watcher呢？因为我们要传入绑定的回调函数用于更新视图，我们很容易想到在Compile类中，第一次挂载后，调用指令的时候会根据不同的指令调用不同的函数更新。因此，我们很容易想到在这里实例化Watcher，比如更新model函数如下
```javascript
model(node, expr, vm) {
  //将表单元素的值替换成实际表达式的值
  let fn = this.updater['model']
  let value = this.getVal(vm, expr)
  // 数据更新调用
  new Watcher(vm, expr, newExpr => {
    let newVal = this.getVal(vm, newExpr)
    fn && fn(node, newVal)
  })
  fn && fn(node, value)
},
```
到这里我们实现了Watcher类，同时考虑到Watcher调用位置，但是事实上，实例化之后，我们并没有立刻调用实例的update，因此此时是不起作用的，也就是说数据更新视图依旧没有更新。而且，一个数据的更新，可能同时有几处视图需要更改，我们考虑实现一个发布订阅模式来完成这个逻辑

#### Dep类实现
- 一个简单的实现
```javascript
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
```
我们还要思考，在哪里实例化这个Dep呢？这里利用了一个比较巧妙也比较难以理解的方法。
- 首先实例化一个Watcher时，我们将Watcher放置到一个全局对象上，结束时取消
```javascript
_getVal() {
  Dep.target = this;
  let value = CompileUtil.getVal(this.vm,this.expr);
  Dep.target = null;
  return value;
}
```
- 对于每个响应式数据，我们有许多观察者Watcher对应。当调用get的时候将watcher放入dep,当调用set的时候通知更新
```javascript
defineReactive(obj, key, value) {
    let self = this
    let dep = new Dep()
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get() {
        //取值
        Dep.target && dep.addSubs(Dep.target)
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
```
到这里修改数据已经能自动更新了
![修改数据，视图自动更新](/img/in-post/mvvm-03.JPG)

#### 双向绑定
到这里我们已经数据的单向绑定，也就是数据改变，视图更新；另一个方向上的绑定，只需要通过监听事件对象即可
```javascript
model(node, expr, vm) {
  //将表单元素的值替换成实际表达式的值
  let fn = this.updater['model']
  let value = this.getVal(vm, expr)
  //双向绑定
  !node.oninput &&//没有监听才绑定
    (node.oninput = event => {
      let value = event.target.value // 获取用户输入的内容
      this.setValue(vm, expr, value)
    })
  // 数据更新调用
  new Watcher(vm, expr, newVal => {
    fn && fn(node, newVal)
  })
  fn && fn(node, value)
},
```
