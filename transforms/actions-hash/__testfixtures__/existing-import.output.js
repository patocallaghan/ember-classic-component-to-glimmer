import Component from '@ember/component';
import { action } from '@ember/object';

export default Component.extend({
  baz: action(function() {
    console.log('baz');
  }),

  foo: action(function() {
    console.log('foo');
  }),

  bar: action(function(val) {
    console.log(val);
  })
});
