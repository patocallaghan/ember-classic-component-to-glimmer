import Component from '@ember/component';
import { action } from '@ember/object';

export default Component.extend({
  actions: {
    async foo() {
      await console.log('foo');
    },
  },
});
