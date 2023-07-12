import Component from '@ember/component';
import { action } from '@ember/object';

export default Component.extend({
  foo: action(async function() {
    await console.log('foo');
  }),
});
