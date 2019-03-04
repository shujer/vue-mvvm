class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm
    this.expr = expr
    this.cb = cb
    this.value = this._getVal()
  }
  _getVal() {
    Dep.target = this;
    let value = CompileUtil.getVal(this.vm,this.expr);
    Dep.target = null;
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
