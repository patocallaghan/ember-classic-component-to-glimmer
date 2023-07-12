import Component from '@ember/component';

export default Component.extend({
  actions: {
    foo() {
      console.log('foo');
    },
    bar(val) {
      console.log(val);
    },
  },
});
