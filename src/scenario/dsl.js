/**
 * Shared DSL statements that are useful to all scenarios.
 */
 
 /**
 * Usage:
 *    wait() waits until you call resume() in the console
 */
 angular.scenario.dsl('wait', function() {
  return function() {
    return this.addFuture('waiting for you to call resume() in the console', function(done) {
      this.$window.resume = function() { done(); };
    });
  };
 });

/**
* Usage:
*    pause(seconds) pauses the test for specified number of seconds
*/
angular.scenario.dsl('pause', function() {
 return function(time) {
   return this.addFuture('pause for ' + time + ' seconds', function(done) {
     this.setTimeout(function() { done(null, time * 1000); }, time * 1000);
   });
 };
});

/**
 * Usage:
 *    expect(future).{matcher} where matcher is one of the matchers defined
 *    with angular.scenario.matcher
 *
 * ex. expect(binding("name")).toEqual("Elliott")
 */
angular.scenario.dsl('expect', function() {
  var chain = angular.extend({}, angular.scenario.matcher);

  chain.not = function() {
    this.inverse = true;
    return chain;
  };

  return function(future) {
    this.future = future;
    return chain;
  };
});

/**
 * Usage:
 *    navigateTo(future|string) where url a string or future with a value
 *    of a  URL to navigate to
 */
angular.scenario.dsl('navigateTo', function() {
  return function(url, delegate) {
    var application = this.application;
    return this.addFuture('navigate to ' + url, function(done) {
      if (delegate) {
        url = delegate.call(this, url);
      }
      application.navigateTo(url, function() {
        application.executeAction(function($window) {
          if ($window.angular) {
            var $browser = $window.angular.service.$browser();
            $browser.poll();
            $browser.notifyWhenNoOutstandingRequests(function() {
              done(null, url);
            });
          } else {
            done(null, url);
          }
        });
      });
    });
  };
});

/**
 * Usage:
 *    using(selector) scopes the next DSL element selection
 *
 * ex.
 *   using('#foo').input('bar')
 */
angular.scenario.dsl('using', function() {
  return function(selector) {
    this.selector = (this.selector||'') + ' ' + selector;
    return this.dsl;
  };
});

/**
 * Usage:
 *    binding(name) returns the value of a binding
 */
angular.scenario.dsl('binding', function() {
  return function(name) {
    return this.addFutureAction("select binding '" + name + "'", function($window, $document, done) {
      var element;
      try {
        element = $document.elements('[ng\\:bind-template*="{{$1}}"]', name);
      } catch(e) {
        if (e.type !== 'selector')
          throw e;
        element = $document.elements('[ng\\:bind="$1"]', name);
      }
      done(null, element.text());
    });
  };
});

/**
 * Usage:
 *    input(name).enter(value) enters value in input with specified name
 *    input(name).check() checks checkbox
 *    input(name).select(value) selects the readio button with specified name/value
 */
angular.scenario.dsl('input', function() {
  var chain = {};

  chain.enter = function(value) {
    return this.addFutureAction("input '" + this.name + "' enter '" + value + "'", function($window, $document, done) {
      var input = $document.elements('input[name="$1"]', this.name);
      input.val(value);
      input.trigger('change');
      done();
    });
  };

  chain.check = function() {
    return this.addFutureAction("checkbox '" + this.name + "' toggle", function($window, $document, done) {
      var input = $document.elements('input:checkbox[name="$1"]', this.name);
      input.trigger('click');
      done();
    });
  };

  chain.select = function(value) {
    return this.addFutureAction("radio button '" + this.name + "' toggle '" + value + "'", function($window, $document, done) {
      var input = $document.
        elements('input:radio[name$="@$1"][value="$2"]', this.name, value);
      input.trigger('click');
      done();
    });
  };

  return function(name) {
    this.name = name;
    return chain;
  };
});

/**
 * Usage:
 *    repeater('#products table').count() number of rows
 *    repeater('#products table').row(1) all bindings in row as an array
 *    repeater('#products table').column('product.name') all values across all rows in an array
 */
angular.scenario.dsl('repeater', function() {
  var chain = {};

  chain.count = function() {
    return this.addFutureAction('repeater ' + this.selector + ' count', function($window, $document, done) {
      done(null, $document.elements().size());
    });
  };

  chain.column = function(binding) {
    return this.addFutureAction('repeater ' + this.selector + ' column ' + binding, function($window, $document, done) {
      var values = [];
      $document.elements().each(function() {
        _jQuery(this).find(':visible').each(function() {
          var element = _jQuery(this);
          if (element.attr('ng:bind') === binding) {
            values.push(element.text());
          }
        });
      });
      done(null, values);
    });
  };

  chain.row = function(index) {
    return this.addFutureAction('repeater ' + this.selector + ' row ' + index, function($window, $document, done) {
      var values = [];
      var matches = $document.elements().slice(index, index + 1);
      if (!matches.length)
        return done('row ' + index + ' out of bounds');
      _jQuery(matches[0]).find(':visible').each(function() {
        var element = _jQuery(this);
        if (element.attr('ng:bind')) {
          values.push(element.text());
        }
      });
      done(null, values);
    });
  };

  return function(selector) {
    this.dsl.using(selector);
    return chain;
  };
});

/**
 * Usage:
 *    select(selector).option('value') select one option
 *    select(selector).options('value1', 'value2', ...) select options from a multi select
 */
angular.scenario.dsl('select', function() {
  var chain = {};

  chain.option = function(value) {
    return this.addFutureAction('select ' + this.name + ' option ' + value, function($window, $document, done) {
      var select = $document.elements('select[name="$1"]', this.name);
      select.val(value);
      select.trigger('change');
      done();
    });
  };

  chain.options = function() {
    var values = arguments;
    return this.addFutureAction('select ' + this.name + ' options ' + values, function($window, $document, done) {
      var select = $document.elements('select[multiple][name="$1"]', this.name);
      select.val(values);
      select.trigger('change');
      done();
    });
  };

  return function(name) {
    this.name = name;
    return chain;
  };
});

/**
 * Usage:
 *    element(selector).click() clicks an element
 *    element(selector).attr(name) gets the value of an attribute
 *    element(selector).attr(name, value) sets the value of an attribute
 *    element(selector).val() gets the value (as defined by jQuery)
 *    element(selector).val(value) sets the value (as defined by jQuery)
 *    element(selector).query(fn) executes fn(selectedElements, done)
 */
angular.scenario.dsl('element', function() {
  var chain = {};

  chain.click = function() {
    return this.addFutureAction('element ' + this.selector + ' click', function($window, $document, done) {
      $document.elements().trigger('click');
      done();
    });
  };

  chain.attr = function(name, value) {
    var futureName = 'element ' + this.selector + ' get attribute ' + name;
    if (value) {
      futureName = 'element ' + this.selector + ' set attribute ' + name + ' to ' + value;
    }
    return this.addFutureAction(futureName, function($window, $document, done) {
      done(null, $document.elements().attr(name, value));
    });
  };

  chain.val = function(value) {
    var futureName = 'element ' + this.selector + ' value';
    if (value) {
      futureName = 'element ' + this.selector + ' set value to ' + value;
    }
    return this.addFutureAction(futureName, function($window, $document, done) {
      done(null, $document.elements().val(value));
    });
  };

  chain.query = function(fn) {
    return this.addFutureAction('element ' + this.selector + ' custom query', function($window, $document, done) {
      fn.call(this, $document.elements(), done);
    });
  };

  return function(selector) {
    this.dsl.using(selector);
    return chain;
  };
});