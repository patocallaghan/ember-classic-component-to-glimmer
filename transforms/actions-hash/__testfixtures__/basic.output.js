import Component from '@ember/component';

import { action } from '@ember/object';

export default Component.extend({
  foo: action(function() {
    console.log('foo');
  }),

  bar: action(function(val) {
    console.log(val);
  })
});
