import Component from '@ember/component';
import { action } from '@ember/object';

export default Component.extend({
  baz: action(function() {
    console.log('baz');
  }),
  actions: {
    foo() {
      console.log('foo');
    },
    bar(val) {
      console.log(val);
    },
  },
});
