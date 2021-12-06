
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    let name = "Taj";

    /* src/inc/header.svelte generated by Svelte v3.44.0 */
    const file$l = "src/inc/header.svelte";

    function create_fragment$l(ctx) {
    	let header;
    	let a0;
    	let div0;
    	let t0;
    	let div1;
    	let t2;
    	let ul0;
    	let li0;
    	let a1;
    	let t4;
    	let li1;
    	let a2;
    	let t6;
    	let li2;
    	let a3;
    	let t8;
    	let li3;
    	let a4;
    	let t10;
    	let li4;
    	let a5;
    	let t12;
    	let li5;
    	let a6;
    	let t14;
    	let li6;
    	let a7;
    	let t16;
    	let li7;
    	let a8;
    	let t18;
    	let div2;
    	let t19;
    	let div6;
    	let div3;
    	let t20;
    	let div4;
    	let t21;
    	let div5;
    	let t22;
    	let div12;
    	let div10;
    	let a9;
    	let div7;
    	let t23;
    	let div8;
    	let t25;
    	let div9;
    	let svg;
    	let path;
    	let t26;
    	let div11;
    	let ul1;
    	let li8;
    	let a10;
    	let t28;
    	let li9;
    	let a11;
    	let t30;
    	let li10;
    	let a12;
    	let t32;
    	let li11;
    	let a13;
    	let t34;
    	let li12;
    	let a14;
    	let t36;
    	let li13;
    	let a15;
    	let t38;
    	let li14;
    	let a16;
    	let t40;
    	let li15;
    	let a17;

    	const block = {
    		c: function create() {
    			header = element("header");
    			a0 = element("a");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			div1.textContent = `${name}`;
    			t2 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			a1.textContent = "About";
    			t4 = space();
    			li1 = element("li");
    			a2 = element("a");
    			a2.textContent = "Services";
    			t6 = space();
    			li2 = element("li");
    			a3 = element("a");
    			a3.textContent = "Road Map";
    			t8 = space();
    			li3 = element("li");
    			a4 = element("a");
    			a4.textContent = "Statistic";
    			t10 = space();
    			li4 = element("li");
    			a5 = element("a");
    			a5.textContent = "Token";
    			t12 = space();
    			li5 = element("li");
    			a6 = element("a");
    			a6.textContent = "WhitePappers";
    			t14 = space();
    			li6 = element("li");
    			a7 = element("a");
    			a7.textContent = "Team";
    			t16 = space();
    			li7 = element("li");
    			a8 = element("a");
    			a8.textContent = "FAQ";
    			t18 = space();
    			div2 = element("div");
    			t19 = space();
    			div6 = element("div");
    			div3 = element("div");
    			t20 = space();
    			div4 = element("div");
    			t21 = space();
    			div5 = element("div");
    			t22 = space();
    			div12 = element("div");
    			div10 = element("div");
    			a9 = element("a");
    			div7 = element("div");
    			t23 = space();
    			div8 = element("div");
    			div8.textContent = `${name}`;
    			t25 = space();
    			div9 = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t26 = space();
    			div11 = element("div");
    			ul1 = element("ul");
    			li8 = element("li");
    			a10 = element("a");
    			a10.textContent = "About";
    			t28 = space();
    			li9 = element("li");
    			a11 = element("a");
    			a11.textContent = "Services";
    			t30 = space();
    			li10 = element("li");
    			a12 = element("a");
    			a12.textContent = "Road Map";
    			t32 = space();
    			li11 = element("li");
    			a13 = element("a");
    			a13.textContent = "Statistic";
    			t34 = space();
    			li12 = element("li");
    			a14 = element("a");
    			a14.textContent = "Token";
    			t36 = space();
    			li13 = element("li");
    			a15 = element("a");
    			a15.textContent = "WhitePappers";
    			t38 = space();
    			li14 = element("li");
    			a16 = element("a");
    			a16.textContent = "Team";
    			t40 = space();
    			li15 = element("li");
    			a17 = element("a");
    			a17.textContent = "FAQ";
    			attr_dev(div0, "class", "logo__img");
    			add_location(div0, file$l, 7, 3, 112);
    			attr_dev(div1, "class", "logo__title");
    			add_location(div1, file$l, 8, 3, 145);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "logo");
    			add_location(a0, file$l, 6, 2, 83);
    			attr_dev(a1, "href", "#about");
    			attr_dev(a1, "class", "menu__link");
    			add_location(a1, file$l, 13, 4, 244);
    			attr_dev(li0, "class", "menu__item");
    			add_location(li0, file$l, 12, 3, 216);
    			attr_dev(a2, "href", "#services");
    			attr_dev(a2, "class", "menu__link");
    			add_location(a2, file$l, 16, 4, 330);
    			attr_dev(li1, "class", "menu__item");
    			add_location(li1, file$l, 15, 3, 302);
    			attr_dev(a3, "href", "#map");
    			attr_dev(a3, "class", "menu__link");
    			add_location(a3, file$l, 19, 4, 422);
    			attr_dev(li2, "class", "menu__item");
    			add_location(li2, file$l, 18, 3, 394);
    			attr_dev(a4, "href", "#stat");
    			attr_dev(a4, "class", "menu__link");
    			add_location(a4, file$l, 22, 4, 509);
    			attr_dev(li3, "class", "menu__item");
    			add_location(li3, file$l, 21, 3, 481);
    			attr_dev(a5, "href", "#token");
    			attr_dev(a5, "class", "menu__link");
    			add_location(a5, file$l, 25, 4, 598);
    			attr_dev(li4, "class", "menu__item");
    			add_location(li4, file$l, 24, 3, 570);
    			attr_dev(a6, "href", "#docs");
    			attr_dev(a6, "class", "menu__link");
    			add_location(a6, file$l, 28, 4, 684);
    			attr_dev(li5, "class", "menu__item");
    			add_location(li5, file$l, 27, 3, 656);
    			attr_dev(a7, "href", "#team");
    			attr_dev(a7, "class", "menu__link");
    			add_location(a7, file$l, 31, 4, 776);
    			attr_dev(li6, "class", "menu__item");
    			add_location(li6, file$l, 30, 3, 748);
    			attr_dev(a8, "href", "#faq");
    			attr_dev(a8, "class", "menu__link");
    			add_location(a8, file$l, 34, 4, 860);
    			attr_dev(li7, "class", "menu__item");
    			add_location(li7, file$l, 33, 3, 832);
    			attr_dev(ul0, "class", "menu");
    			add_location(ul0, file$l, 11, 2, 195);
    			attr_dev(div2, "class", "header__right");
    			add_location(div2, file$l, 38, 2, 922);
    			attr_dev(div3, "class", "one");
    			add_location(div3, file$l, 43, 3, 989);
    			attr_dev(div4, "class", "two");
    			add_location(div4, file$l, 44, 3, 1016);
    			attr_dev(div5, "class", "three");
    			add_location(div5, file$l, 45, 3, 1043);
    			attr_dev(div6, "class", "btn-menu");
    			add_location(div6, file$l, 42, 2, 963);
    			attr_dev(header, "class", "header");
    			add_location(header, file$l, 5, 0, 57);
    			attr_dev(div7, "class", "logo__img");
    			add_location(div7, file$l, 53, 4, 1183);
    			attr_dev(div8, "class", "logo__title");
    			add_location(div8, file$l, 54, 4, 1217);
    			attr_dev(a9, "href", "#");
    			attr_dev(a9, "class", "logo");
    			add_location(a9, file$l, 52, 3, 1153);
    			attr_dev(path, "d", "M28.228,23.986L47.092,5.122c1.172-1.171,1.172-3.071,0-4.242c-1.172-1.172-3.07-1.172-4.242,0L23.986,19.744L5.121,0.88   c-1.172-1.172-3.07-1.172-4.242,0c-1.172,1.171-1.172,3.071,0,4.242l18.865,18.864L0.879,42.85c-1.172,1.171-1.172,3.071,0,4.242   C1.465,47.677,2.233,47.97,3,47.97s1.535-0.293,2.121-0.879l18.865-18.864L42.85,47.091c0.586,0.586,1.354,0.879,2.121,0.879   s1.535-0.293,2.121-0.879c1.172-1.171,1.172-3.071,0-4.242L28.228,23.986z");
    			attr_dev(path, "fill", "#006DF0");
    			add_location(path, file$l, 59, 6, 1543);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "x", "0px");
    			attr_dev(svg, "y", "0px");
    			attr_dev(svg, "viewBox", "0 0 47.971 47.971");
    			set_style(svg, "enable-background", "new 0 0 47.971 47.971");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "width", "512px");
    			attr_dev(svg, "height", "512px");
    			add_location(svg, file$l, 58, 5, 1296);
    			attr_dev(div9, "class", "btn-close");
    			add_location(div9, file$l, 57, 3, 1267);
    			attr_dev(div10, "class", "fixed-menu__header");
    			add_location(div10, file$l, 51, 2, 1117);
    			attr_dev(a10, "href", "#about");
    			attr_dev(a10, "class", "mob-menu__link");
    			add_location(a10, file$l, 67, 5, 2136);
    			attr_dev(li8, "class", "mob-menu__item");
    			add_location(li8, file$l, 66, 4, 2103);
    			attr_dev(a11, "href", "#services");
    			attr_dev(a11, "class", "mob-menu__link");
    			add_location(a11, file$l, 70, 5, 2233);
    			attr_dev(li9, "class", "mob-menu__item");
    			add_location(li9, file$l, 69, 4, 2200);
    			attr_dev(a12, "href", "#map");
    			attr_dev(a12, "class", "mob-menu__link");
    			add_location(a12, file$l, 73, 5, 2336);
    			attr_dev(li10, "class", "mob-menu__item");
    			add_location(li10, file$l, 72, 4, 2303);
    			attr_dev(a13, "href", "#stat");
    			attr_dev(a13, "class", "mob-menu__link");
    			add_location(a13, file$l, 76, 5, 2434);
    			attr_dev(li11, "class", "mob-menu__item");
    			add_location(li11, file$l, 75, 4, 2401);
    			attr_dev(a14, "href", "#token");
    			attr_dev(a14, "class", "mob-menu__link");
    			add_location(a14, file$l, 79, 5, 2534);
    			attr_dev(li12, "class", "mob-menu__item");
    			add_location(li12, file$l, 78, 4, 2501);
    			attr_dev(a15, "href", "#docs");
    			attr_dev(a15, "class", "mob-menu__link");
    			add_location(a15, file$l, 82, 5, 2631);
    			attr_dev(li13, "class", "mob-menu__item");
    			add_location(li13, file$l, 81, 4, 2598);
    			attr_dev(a16, "href", "#team");
    			attr_dev(a16, "class", "mob-menu__link");
    			add_location(a16, file$l, 85, 5, 2734);
    			attr_dev(li14, "class", "mob-menu__item");
    			add_location(li14, file$l, 84, 4, 2701);
    			attr_dev(a17, "href", "#faq");
    			attr_dev(a17, "class", "mob-menu__link");
    			add_location(a17, file$l, 88, 5, 2829);
    			attr_dev(li15, "class", "mob-menu__item");
    			add_location(li15, file$l, 87, 4, 2796);
    			attr_dev(ul1, "class", "mob-menu");
    			add_location(ul1, file$l, 65, 3, 2077);
    			attr_dev(div11, "class", "fixed-menu__content");
    			add_location(div11, file$l, 63, 2, 2039);
    			attr_dev(div12, "class", "fixed-menu");
    			add_location(div12, file$l, 50, 0, 1090);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, a0);
    			append_dev(a0, div0);
    			append_dev(a0, t0);
    			append_dev(a0, div1);
    			append_dev(header, t2);
    			append_dev(header, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a1);
    			append_dev(ul0, t4);
    			append_dev(ul0, li1);
    			append_dev(li1, a2);
    			append_dev(ul0, t6);
    			append_dev(ul0, li2);
    			append_dev(li2, a3);
    			append_dev(ul0, t8);
    			append_dev(ul0, li3);
    			append_dev(li3, a4);
    			append_dev(ul0, t10);
    			append_dev(ul0, li4);
    			append_dev(li4, a5);
    			append_dev(ul0, t12);
    			append_dev(ul0, li5);
    			append_dev(li5, a6);
    			append_dev(ul0, t14);
    			append_dev(ul0, li6);
    			append_dev(li6, a7);
    			append_dev(ul0, t16);
    			append_dev(ul0, li7);
    			append_dev(li7, a8);
    			append_dev(header, t18);
    			append_dev(header, div2);
    			append_dev(header, t19);
    			append_dev(header, div6);
    			append_dev(div6, div3);
    			append_dev(div6, t20);
    			append_dev(div6, div4);
    			append_dev(div6, t21);
    			append_dev(div6, div5);
    			insert_dev(target, t22, anchor);
    			insert_dev(target, div12, anchor);
    			append_dev(div12, div10);
    			append_dev(div10, a9);
    			append_dev(a9, div7);
    			append_dev(a9, t23);
    			append_dev(a9, div8);
    			append_dev(div10, t25);
    			append_dev(div10, div9);
    			append_dev(div9, svg);
    			append_dev(svg, path);
    			append_dev(div12, t26);
    			append_dev(div12, div11);
    			append_dev(div11, ul1);
    			append_dev(ul1, li8);
    			append_dev(li8, a10);
    			append_dev(ul1, t28);
    			append_dev(ul1, li9);
    			append_dev(li9, a11);
    			append_dev(ul1, t30);
    			append_dev(ul1, li10);
    			append_dev(li10, a12);
    			append_dev(ul1, t32);
    			append_dev(ul1, li11);
    			append_dev(li11, a13);
    			append_dev(ul1, t34);
    			append_dev(ul1, li12);
    			append_dev(li12, a14);
    			append_dev(ul1, t36);
    			append_dev(ul1, li13);
    			append_dev(li13, a15);
    			append_dev(ul1, t38);
    			append_dev(ul1, li14);
    			append_dev(li14, a16);
    			append_dev(ul1, t40);
    			append_dev(ul1, li15);
    			append_dev(li15, a17);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching) detach_dev(t22);
    			if (detaching) detach_dev(div12);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ name });
    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$l.name
    		});
    	}
    }

    /* src/inc/promo.svelte generated by Svelte v3.44.0 */

    const file$k = "src/inc/promo.svelte";

    function create_fragment$k(ctx) {
    	let section;
    	let div11;
    	let div10;
    	let div9;
    	let h1;
    	let t0;
    	let span;
    	let t2;
    	let p;
    	let t4;
    	let div6;
    	let div0;
    	let t5;
    	let div5;
    	let div1;
    	let t7;
    	let div2;
    	let t9;
    	let div3;
    	let t11;
    	let div4;
    	let t13;
    	let div7;
    	let a;
    	let t15;
    	let div8;
    	let img0;
    	let img0_src_value;
    	let t16;
    	let img1;
    	let img1_src_value;
    	let t17;
    	let img2;
    	let img2_src_value;
    	let t18;
    	let img3;
    	let img3_src_value;
    	let t19;
    	let img4;
    	let img4_src_value;
    	let t20;
    	let div12;
    	let img5;
    	let img5_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			h1 = element("h1");
    			t0 = text("Taj Just Entered ");
    			span = element("span");
    			span.textContent = "the Real World";
    			t2 = space();
    			p = element("p");
    			p.textContent = "Spend real fights effective anything extra by leading. Mouthwatering leading how real formula also locked-in have can mountain thought. Jumbo plus shine sale.";
    			t4 = space();
    			div6 = element("div");
    			div0 = element("div");
    			t5 = space();
    			div5 = element("div");
    			div1 = element("div");
    			div1.textContent = "Days";
    			t7 = space();
    			div2 = element("div");
    			div2.textContent = "Hours";
    			t9 = space();
    			div3 = element("div");
    			div3.textContent = "Minutes";
    			t11 = space();
    			div4 = element("div");
    			div4.textContent = "Seconds";
    			t13 = space();
    			div7 = element("div");
    			a = element("a");
    			a.textContent = "White Papers";
    			t15 = space();
    			div8 = element("div");
    			img0 = element("img");
    			t16 = space();
    			img1 = element("img");
    			t17 = space();
    			img2 = element("img");
    			t18 = space();
    			img3 = element("img");
    			t19 = space();
    			img4 = element("img");
    			t20 = space();
    			div12 = element("div");
    			img5 = element("img");
    			add_location(span, file$k, 4, 37, 185);
    			add_location(h1, file$k, 4, 16, 164);
    			add_location(p, file$k, 5, 16, 234);
    			attr_dev(div0, "id", "timer");
    			attr_dev(div0, "class", "timer");
    			add_location(div0, file$k, 10, 20, 500);
    			add_location(div1, file$k, 12, 24, 609);
    			add_location(div2, file$k, 13, 24, 649);
    			add_location(div3, file$k, 14, 24, 690);
    			add_location(div4, file$k, 15, 24, 733);
    			attr_dev(div5, "class", "timer__titles");
    			add_location(div5, file$k, 11, 20, 557);
    			attr_dev(div6, "class", "timer-wrap");
    			add_location(div6, file$k, 9, 16, 455);
    			attr_dev(a, "href", "#");
    			attr_dev(a, "class", "btn btn--big btn--blue");
    			add_location(a, file$k, 20, 20, 870);
    			attr_dev(div7, "class", "promo__btns-wrap");
    			add_location(div7, file$k, 19, 16, 819);
    			if (!src_url_equal(img0.src, img0_src_value = "img/visa.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$k, 24, 20, 1013);
    			if (!src_url_equal(img1.src, img1_src_value = "img/mc.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$k, 25, 20, 1065);
    			if (!src_url_equal(img2.src, img2_src_value = "img/bitcoin.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$k, 26, 20, 1115);
    			if (!src_url_equal(img3.src, img3_src_value = "img/paypal.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$k, 27, 20, 1170);
    			attr_dev(div8, "class", "payments");
    			add_location(div8, file$k, 23, 16, 970);
    			attr_dev(div9, "class", "col-12 promo__content");
    			attr_dev(div9, "data-aos", "fade-right");
    			add_location(div9, file$k, 3, 12, 90);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file$k, 2, 8, 60);
    			if (!src_url_equal(img4.src, img4_src_value = "img/promo-bg.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "data-aos", "fade-up");
    			attr_dev(img4, "alt", "");
    			attr_dev(img4, "class", "promo__img");
    			add_location(img4, file$k, 31, 8, 1269);
    			attr_dev(div11, "class", "container");
    			add_location(div11, file$k, 1, 4, 28);
    			if (!src_url_equal(img5.src, img5_src_value = "img/scroll-down.png")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$k, 35, 8, 1394);
    			attr_dev(div12, "class", "scroll-down");
    			add_location(div12, file$k, 34, 4, 1360);
    			attr_dev(section, "class", "promo");
    			add_location(section, file$k, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, h1);
    			append_dev(h1, t0);
    			append_dev(h1, span);
    			append_dev(div9, t2);
    			append_dev(div9, p);
    			append_dev(div9, t4);
    			append_dev(div9, div6);
    			append_dev(div6, div0);
    			append_dev(div6, t5);
    			append_dev(div6, div5);
    			append_dev(div5, div1);
    			append_dev(div5, t7);
    			append_dev(div5, div2);
    			append_dev(div5, t9);
    			append_dev(div5, div3);
    			append_dev(div5, t11);
    			append_dev(div5, div4);
    			append_dev(div9, t13);
    			append_dev(div9, div7);
    			append_dev(div7, a);
    			append_dev(div9, t15);
    			append_dev(div9, div8);
    			append_dev(div8, img0);
    			append_dev(div8, t16);
    			append_dev(div8, img1);
    			append_dev(div8, t17);
    			append_dev(div8, img2);
    			append_dev(div8, t18);
    			append_dev(div8, img3);
    			append_dev(div11, t19);
    			append_dev(div11, img4);
    			append_dev(section, t20);
    			append_dev(section, div12);
    			append_dev(div12, img5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Promo', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Promo> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Promo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Promo",
    			options,
    			id: create_fragment$k.name
    		});
    	}
    }

    /* src/inc/economy.svelte generated by Svelte v3.44.0 */

    const file$j = "src/inc/economy.svelte";

    function create_fragment$j(ctx) {
    	let section;
    	let div5;
    	let div4;
    	let div3;
    	let a;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div2;
    	let div1;
    	let div0;
    	let h4;
    	let t2;
    	let h2;
    	let t3;
    	let span0;
    	let t5;
    	let p;
    	let t7;
    	let ul;
    	let li0;
    	let span1;
    	let t9;
    	let t10;
    	let li1;
    	let span2;
    	let t12;
    	let t13;
    	let li2;
    	let span3;
    	let t15;
    	let t16;
    	let img1;
    	let img1_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			a = element("a");
    			img0 = element("img");
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "decentralised economy";
    			t2 = space();
    			h2 = element("h2");
    			t3 = text("A banking platform that ");
    			span0 = element("span");
    			span0.textContent = "enables developer solutions";
    			t5 = space();
    			p = element("p");
    			p.textContent = "Spend real fights effective anything extra by leading. Mouthwatering leading how real formula also locked-in have can mountain thought. Jumbo plus shine sale.";
    			t7 = space();
    			ul = element("ul");
    			li0 = element("li");
    			span1 = element("span");
    			span1.textContent = "Modular structure";
    			t9 = text(" enabling easy implementation for different softwares");
    			t10 = space();
    			li1 = element("li");
    			span2 = element("span");
    			span2.textContent = "Advanced payment";
    			t12 = text(" and processing technologies, fine-tuned from more than 3 years of development testing");
    			t13 = space();
    			li2 = element("li");
    			span3 = element("span");
    			span3.textContent = "Unified AppStore";
    			t15 = text(" for retail cryptocurrency solutions with a Crypterium products audience");
    			t16 = space();
    			img1 = element("img");
    			if (!src_url_equal(img0.src, img0_src_value = "img/video-btn.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$j, 7, 20, 356);
    			attr_dev(a, "data-jarallax-element", "-40");
    			attr_dev(a, "href", "https://www.youtube.com/watch?v=3cZjVFKzugY&list=PLcpkKchW7Xe5K578xRCwQbPbeVQGN5K9h&index=10");
    			attr_dev(a, "class", "economy__video-btn video-btn popup-youtube");
    			add_location(a, file$j, 6, 16, 145);
    			add_location(h4, file$j, 13, 28, 670);
    			add_location(span0, file$j, 15, 56, 790);
    			add_location(h2, file$j, 14, 28, 729);
    			attr_dev(div0, "class", "section-header section-header--white section-header--tire section-header--small-margin");
    			add_location(div0, file$j, 12, 24, 541);
    			add_location(p, file$j, 18, 24, 920);
    			add_location(span1, file$j, 23, 32, 1234);
    			add_location(li0, file$j, 22, 28, 1197);
    			add_location(span2, file$j, 26, 32, 1418);
    			add_location(li1, file$j, 25, 28, 1381);
    			add_location(span3, file$j, 29, 32, 1633);
    			add_location(li2, file$j, 28, 28, 1596);
    			add_location(ul, file$j, 21, 24, 1164);
    			attr_dev(div1, "class", "economy__block-content");
    			add_location(div1, file$j, 11, 20, 480);
    			attr_dev(div2, "class", "economy__block");
    			add_location(div2, file$j, 10, 16, 431);
    			attr_dev(div3, "class", "col-lg-8 offset-lg-4");
    			add_location(div3, file$j, 4, 12, 93);
    			attr_dev(div4, "class", "row");
    			add_location(div4, file$j, 3, 8, 63);
    			attr_dev(div5, "class", "container");
    			add_location(div5, file$j, 2, 4, 31);
    			if (!src_url_equal(img1.src, img1_src_value = "img/video-bg.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			attr_dev(img1, "class", "economy__bg");
    			add_location(img1, file$j, 37, 4, 1898);
    			attr_dev(section, "class", "economy");
    			add_location(section, file$j, 1, 0, 1);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, a);
    			append_dev(a, img0);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t2);
    			append_dev(div0, h2);
    			append_dev(h2, t3);
    			append_dev(h2, span0);
    			append_dev(div1, t5);
    			append_dev(div1, p);
    			append_dev(div1, t7);
    			append_dev(div1, ul);
    			append_dev(ul, li0);
    			append_dev(li0, span1);
    			append_dev(li0, t9);
    			append_dev(ul, t10);
    			append_dev(ul, li1);
    			append_dev(li1, span2);
    			append_dev(li1, t12);
    			append_dev(ul, t13);
    			append_dev(ul, li2);
    			append_dev(li2, span3);
    			append_dev(li2, t15);
    			append_dev(section, t16);
    			append_dev(section, img1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Economy', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Economy> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Economy extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Economy",
    			options,
    			id: create_fragment$j.name
    		});
    	}
    }

    /* src/inc/about.svelte generated by Svelte v3.44.0 */

    const file$i = "src/inc/about.svelte";

    function create_fragment$i(ctx) {
    	let section;
    	let div5;
    	let div4;
    	let div2;
    	let div0;
    	let h4;
    	let t1;
    	let h2;
    	let t2;
    	let span;
    	let t4;
    	let div1;
    	let p;
    	let t6;
    	let ul;
    	let li0;
    	let t8;
    	let li1;
    	let t10;
    	let li2;
    	let t12;
    	let div3;
    	let img0;
    	let img0_src_value;
    	let t13;
    	let img1;
    	let img1_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div5 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "About ICO";
    			t1 = space();
    			h2 = element("h2");
    			t2 = text("Cryptoland Theme ");
    			span = element("span");
    			span.textContent = "is the best for your ICO";
    			t4 = space();
    			div1 = element("div");
    			p = element("p");
    			p.textContent = "Spend real fights effective anything extra by leading. Mouthwatering leading how real formula also locked-in have can mountain thought. Jumbo plus shine sale.";
    			t6 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "Mouthwatering leading how real formula also";
    			t8 = space();
    			li1 = element("li");
    			li1.textContent = "Locked-in have can mountain thought";
    			t10 = space();
    			li2 = element("li");
    			li2.textContent = "Locked-in have can mountain thought";
    			t12 = space();
    			div3 = element("div");
    			img0 = element("img");
    			t13 = space();
    			img1 = element("img");
    			add_location(h4, file$i, 5, 6, 255);
    			add_location(span, file$i, 6, 27, 301);
    			add_location(h2, file$i, 6, 6, 280);
    			attr_dev(div0, "class", "section-header section-header--animated section-header--tire section-header--small-margin");
    			add_location(div0, file$i, 4, 5, 145);
    			add_location(p, file$i, 10, 6, 415);
    			add_location(li0, file$i, 14, 7, 614);
    			add_location(li1, file$i, 17, 7, 691);
    			add_location(li2, file$i, 18, 7, 743);
    			add_location(ul, file$i, 13, 6, 602);
    			attr_dev(div1, "class", "about__animated-content");
    			add_location(div1, file$i, 9, 5, 371);
    			attr_dev(div2, "data-aos", "fade-right");
    			attr_dev(div2, "class", "col-lg-5");
    			add_location(div2, file$i, 3, 4, 95);
    			if (!src_url_equal(img0.src, img0_src_value = "img/about-img.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "about__img img-responsive");
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$i, 23, 5, 886);
    			attr_dev(div3, "class", "col-lg-6 offset-lg-1 align-items-center");
    			add_location(div3, file$i, 22, 4, 827);
    			attr_dev(div4, "class", "row");
    			add_location(div4, file$i, 2, 3, 73);
    			attr_dev(div5, "class", "container");
    			add_location(div5, file$i, 1, 2, 46);
    			if (!src_url_equal(img1.src, img1_src_value = "img/about-bg.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "data-jarallax-element", "40");
    			attr_dev(img1, "alt", "");
    			attr_dev(img1, "class", "about__bg");
    			add_location(img1, file$i, 27, 2, 989);
    			attr_dev(section, "class", "section about");
    			attr_dev(section, "id", "about");
    			add_location(section, file$i, 0, 1, 1);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div2);
    			append_dev(div2, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(h2, t2);
    			append_dev(h2, span);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, p);
    			append_dev(div1, t6);
    			append_dev(div1, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(ul, t10);
    			append_dev(ul, li2);
    			append_dev(div4, t12);
    			append_dev(div4, div3);
    			append_dev(div3, img0);
    			append_dev(section, t13);
    			append_dev(section, img1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('About', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    /* src/inc/services.svelte generated by Svelte v3.44.0 */

    const file$h = "src/inc/services.svelte";

    function create_fragment$h(ctx) {
    	let section;
    	let div18;
    	let div17;
    	let div16;
    	let div0;
    	let h4;
    	let t1;
    	let h2;
    	let t3;
    	let div15;
    	let div7;
    	let div3;
    	let div1;
    	let t4;
    	let img0;
    	let img0_src_value;
    	let t5;
    	let div2;
    	let t7;
    	let div6;
    	let div4;
    	let t8;
    	let img1;
    	let img1_src_value;
    	let t9;
    	let div5;
    	let t11;
    	let div14;
    	let div10;
    	let div8;
    	let t12;
    	let img2;
    	let img2_src_value;
    	let t13;
    	let div9;
    	let t15;
    	let div13;
    	let div11;
    	let t16;
    	let img3;
    	let img3_src_value;
    	let t17;
    	let div12;
    	let t19;
    	let img4;
    	let img4_src_value;
    	let t20;
    	let img5;
    	let img5_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div18 = element("div");
    			div17 = element("div");
    			div16 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Awesome services";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Why it needs?";
    			t3 = space();
    			div15 = element("div");
    			div7 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			t4 = space();
    			img0 = element("img");
    			t5 = space();
    			div2 = element("div");
    			div2.textContent = "Mining Service";
    			t7 = space();
    			div6 = element("div");
    			div4 = element("div");
    			t8 = space();
    			img1 = element("img");
    			t9 = space();
    			div5 = element("div");
    			div5.textContent = "Cryptoland App";
    			t11 = space();
    			div14 = element("div");
    			div10 = element("div");
    			div8 = element("div");
    			t12 = space();
    			img2 = element("img");
    			t13 = space();
    			div9 = element("div");
    			div9.textContent = "Blockchain";
    			t15 = space();
    			div13 = element("div");
    			div11 = element("div");
    			t16 = space();
    			img3 = element("img");
    			t17 = space();
    			div12 = element("div");
    			div12.textContent = "Exchange";
    			t19 = space();
    			img4 = element("img");
    			t20 = space();
    			img5 = element("img");
    			add_location(h4, file$h, 6, 6, 258);
    			add_location(h2, file$h, 7, 6, 290);
    			attr_dev(div0, "class", "section-header section-header--animated section-header--center section-header--medium-margin");
    			add_location(div0, file$h, 5, 5, 145);
    			attr_dev(div1, "class", "service__bg");
    			set_style(div1, "background-color", "#e85f70");
    			set_style(div1, "box-shadow", "0 0 51px rgba(232, 95, 112, 0.74)");
    			set_style(div1, "box-shadow", "0 0 51px rgba(232, 95, 112, 0.74)");
    			add_location(div1, file$h, 13, 8, 452);
    			if (!src_url_equal(img0.src, img0_src_value = "img/service-icon-1.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$h, 14, 8, 621);
    			attr_dev(div2, "class", "service__title");
    			add_location(div2, file$h, 15, 8, 671);
    			attr_dev(div3, "data-aos", "fade-up");
    			attr_dev(div3, "class", "service");
    			add_location(div3, file$h, 12, 7, 403);
    			attr_dev(div4, "class", "service__bg");
    			set_style(div4, "background-color", "#fa8936");
    			set_style(div4, "background-image", "linear-gradient(-234deg, #ea9d64 0%, #fa8936 100%)");
    			set_style(div4, "box-shadow", "0 0 51px rgba(250, 137, 54, 0.74)");
    			add_location(div4, file$h, 20, 8, 830);
    			if (!src_url_equal(img1.src, img1_src_value = "img/service-icon-2.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$h, 21, 8, 1022);
    			attr_dev(div5, "class", "service__title");
    			add_location(div5, file$h, 22, 8, 1072);
    			attr_dev(div6, "data-aos", "fade-up");
    			attr_dev(div6, "data-aos-delay", "200");
    			attr_dev(div6, "class", "service");
    			add_location(div6, file$h, 19, 7, 760);
    			attr_dev(div7, "class", "services__left");
    			add_location(div7, file$h, 11, 6, 367);
    			attr_dev(div8, "class", "service__bg");
    			set_style(div8, "background-image", "linear-gradient(-234deg, #6ae472 0%, #4bc253 100%)");
    			set_style(div8, "box-shadow", "0 0 51px rgba(75, 194, 83, 0.74)");
    			add_location(div8, file$h, 29, 8, 1281);
    			if (!src_url_equal(img2.src, img2_src_value = "img/service-icon-3.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$h, 30, 8, 1445);
    			attr_dev(div9, "class", "service__title");
    			add_location(div9, file$h, 31, 8, 1495);
    			attr_dev(div10, "data-aos", "fade-up");
    			attr_dev(div10, "data-aos-delay", "400");
    			attr_dev(div10, "class", "service");
    			add_location(div10, file$h, 28, 7, 1210);
    			attr_dev(div11, "class", "service__bg");
    			set_style(div11, "background-color", "#0090d5");
    			set_style(div11, "background-image", "linear-gradient(-234deg, #29aceb 0%, #0090d5 100%)");
    			set_style(div11, "box-shadow", "0 0 51px rgba(0, 144, 213, 0.74)");
    			add_location(div11, file$h, 36, 8, 1650);
    			if (!src_url_equal(img3.src, img3_src_value = "img/service-icon-4.svg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$h, 37, 8, 1841);
    			attr_dev(div12, "class", "service__title");
    			add_location(div12, file$h, 38, 8, 1891);
    			attr_dev(div13, "data-aos", "fade-up");
    			attr_dev(div13, "data-aos-delay", "600");
    			attr_dev(div13, "class", "service");
    			add_location(div13, file$h, 35, 7, 1580);
    			attr_dev(div14, "class", "services__right");
    			add_location(div14, file$h, 27, 6, 1173);
    			attr_dev(div15, "class", "services__items");
    			add_location(div15, file$h, 10, 5, 331);
    			attr_dev(div16, "class", "col");
    			add_location(div16, file$h, 4, 4, 122);
    			attr_dev(div17, "class", "row");
    			add_location(div17, file$h, 3, 3, 100);
    			attr_dev(div18, "class", "container");
    			add_location(div18, file$h, 2, 2, 73);
    			if (!src_url_equal(img4.src, img4_src_value = "img/services-bg1.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			attr_dev(img4, "class", "services__bg");
    			add_location(img4, file$h, 47, 2, 2024);
    			if (!src_url_equal(img5.src, img5_src_value = "img/services-bg-1.png")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "class", "services__cosmos");
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$h, 48, 2, 2087);
    			attr_dev(section, "class", "section section--no-pad-bot services");
    			attr_dev(section, "id", "services");
    			add_location(section, file$h, 1, 1, 2);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div18);
    			append_dev(div18, div17);
    			append_dev(div17, div16);
    			append_dev(div16, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(div16, t3);
    			append_dev(div16, div15);
    			append_dev(div15, div7);
    			append_dev(div7, div3);
    			append_dev(div3, div1);
    			append_dev(div3, t4);
    			append_dev(div3, img0);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div7, t7);
    			append_dev(div7, div6);
    			append_dev(div6, div4);
    			append_dev(div6, t8);
    			append_dev(div6, img1);
    			append_dev(div6, t9);
    			append_dev(div6, div5);
    			append_dev(div15, t11);
    			append_dev(div15, div14);
    			append_dev(div14, div10);
    			append_dev(div10, div8);
    			append_dev(div10, t12);
    			append_dev(div10, img2);
    			append_dev(div10, t13);
    			append_dev(div10, div9);
    			append_dev(div14, t15);
    			append_dev(div14, div13);
    			append_dev(div13, div11);
    			append_dev(div13, t16);
    			append_dev(div13, img3);
    			append_dev(div13, t17);
    			append_dev(div13, div12);
    			append_dev(section, t19);
    			append_dev(section, img4);
    			append_dev(section, t20);
    			append_dev(section, img5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Services', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Services> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Services extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Services",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src/inc/roadmap.svelte generated by Svelte v3.44.0 */

    const file$g = "src/inc/roadmap.svelte";

    function create_fragment$g(ctx) {
    	let section;
    	let div34;
    	let div2;
    	let div1;
    	let div0;
    	let h4;
    	let t1;
    	let h2;
    	let t3;
    	let div33;
    	let div32;
    	let div31;
    	let div6;
    	let div3;
    	let t4;
    	let div5;
    	let div4;
    	let t6;
    	let p0;
    	let t8;
    	let div10;
    	let div7;
    	let t9;
    	let div9;
    	let div8;
    	let t11;
    	let p1;
    	let t13;
    	let div14;
    	let div11;
    	let t14;
    	let div13;
    	let div12;
    	let t16;
    	let p2;
    	let t18;
    	let div18;
    	let div15;
    	let t19;
    	let div17;
    	let div16;
    	let t21;
    	let p3;
    	let t23;
    	let div22;
    	let div19;
    	let t24;
    	let div21;
    	let div20;
    	let t26;
    	let p4;
    	let t28;
    	let div26;
    	let div23;
    	let t29;
    	let div25;
    	let div24;
    	let t31;
    	let p5;
    	let t33;
    	let div30;
    	let div27;
    	let t34;
    	let div29;
    	let div28;
    	let t36;
    	let p6;
    	let t38;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div34 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Our way";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Road Map";
    			t3 = space();
    			div33 = element("div");
    			div32 = element("div");
    			div31 = element("div");
    			div6 = element("div");
    			div3 = element("div");
    			t4 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div4.textContent = "June 2017";
    			t6 = space();
    			p0 = element("p");
    			p0.textContent = "Dolly Varden trout flathead tui chub bigmouth buffalo golden loach ghost flathead sauger amur pike, jewel tetra roosterfish mora herring\n                                    Pacific lamprey";
    			t8 = space();
    			div10 = element("div");
    			div7 = element("div");
    			t9 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div8.textContent = "July 2017";
    			t11 = space();
    			p1 = element("p");
    			p1.textContent = "Pirate perch smooth dogfish, flagblenny delta smelt, gopher rockfish bramble shark Sevan trout queen triggerfish basslet. Redtooth triggerfish prickly shark tarwhine tube-eye Reef triggerfish rohu longfin dragonfish";
    			t13 = space();
    			div14 = element("div");
    			div11 = element("div");
    			t14 = space();
    			div13 = element("div");
    			div12 = element("div");
    			div12.textContent = "December 2017";
    			t16 = space();
    			p2 = element("p");
    			p2.textContent = "Pacific argentine. Lined sole masu salmon wolffish cutthroat trout mustard eel huchen, sea toad grenadier madtom yellow moray Shingle Fish wrymouth giant";
    			t18 = space();
    			div18 = element("div");
    			div15 = element("div");
    			t19 = space();
    			div17 = element("div");
    			div16 = element("div");
    			div16.textContent = "December 2017";
    			t21 = space();
    			p3 = element("p");
    			p3.textContent = "Pacific argentine. Lined sole masu salmon wolffish cutthroat trout mustard eel huchen, sea toad grenadier madtom yellow moray Shingle Fish wrymouth giant";
    			t23 = space();
    			div22 = element("div");
    			div19 = element("div");
    			t24 = space();
    			div21 = element("div");
    			div20 = element("div");
    			div20.textContent = "January 2018";
    			t26 = space();
    			p4 = element("p");
    			p4.textContent = "Walleye silverside American sole rockweed gunnel, handfishyellowtail clownfish, rocket danio; blue gourami, ayu gulper eel false trevally longjaw mudsucker bonytail chub. Yellow moray french angelfish sand stargazer northern squawfish shiner dab mola yellow moray sea lamprey torrent catfish sauger blue gourami handfish Sacramento blackfish";
    			t28 = space();
    			div26 = element("div");
    			div23 = element("div");
    			t29 = space();
    			div25 = element("div");
    			div24 = element("div");
    			div24.textContent = "April 2018";
    			t31 = space();
    			p5 = element("p");
    			p5.textContent = "Blue gourami, ayu gulper eel false trevally longjaw mudsucker bonytail chub. Yellow moray french angelfish sand stargazer";
    			t33 = space();
    			div30 = element("div");
    			div27 = element("div");
    			t34 = space();
    			div29 = element("div");
    			div28 = element("div");
    			div28.textContent = "May 2018";
    			t36 = space();
    			p6 = element("p");
    			p6.textContent = "Livebearer greeneye barred danio mosquitofish king of herring. Sturgeon tenpounder-píntano tiger shark harelip sucker";
    			t38 = space();
    			img = element("img");
    			add_location(h4, file$g, 5, 20, 266);
    			add_location(h2, file$g, 6, 20, 303);
    			attr_dev(div0, "class", "section-header section-header--animated section-header--center section-header--medium-margin");
    			add_location(div0, file$g, 4, 16, 139);
    			attr_dev(div1, "class", "col");
    			add_location(div1, file$g, 3, 12, 105);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$g, 2, 8, 75);
    			attr_dev(div3, "class", "road__item-metka");
    			add_location(div3, file$g, 15, 24, 577);
    			attr_dev(div4, "class", "road__item-title");
    			add_location(div4, file$g, 17, 28, 699);
    			add_location(p0, file$g, 20, 28, 835);
    			attr_dev(div5, "class", "road__item-content");
    			add_location(div5, file$g, 16, 24, 638);
    			attr_dev(div6, "class", "road__item");
    			add_location(div6, file$g, 14, 20, 528);
    			attr_dev(div7, "class", "road__item-metka");
    			add_location(div7, file$g, 29, 24, 1222);
    			attr_dev(div8, "class", "road__item-title");
    			add_location(div8, file$g, 31, 28, 1344);
    			add_location(p1, file$g, 34, 28, 1480);
    			attr_dev(div9, "class", "road__item-content");
    			add_location(div9, file$g, 30, 24, 1283);
    			attr_dev(div10, "class", "road__item");
    			add_location(div10, file$g, 28, 20, 1173);
    			attr_dev(div11, "class", "road__item-metka");
    			add_location(div11, file$g, 42, 24, 1894);
    			attr_dev(div12, "class", "road__item-title");
    			add_location(div12, file$g, 44, 28, 2016);
    			add_location(p2, file$g, 47, 28, 2156);
    			attr_dev(div13, "class", "road__item-content");
    			add_location(div13, file$g, 43, 24, 1955);
    			attr_dev(div14, "class", "road__item");
    			add_location(div14, file$g, 41, 20, 1845);
    			attr_dev(div15, "class", "road__item-metka");
    			add_location(div15, file$g, 54, 24, 2507);
    			attr_dev(div16, "class", "road__item-title");
    			add_location(div16, file$g, 56, 28, 2629);
    			add_location(p3, file$g, 59, 28, 2769);
    			attr_dev(div17, "class", "road__item-content");
    			add_location(div17, file$g, 55, 24, 2568);
    			attr_dev(div18, "class", "road__item");
    			add_location(div18, file$g, 53, 20, 2458);
    			attr_dev(div19, "class", "road__item-metka");
    			add_location(div19, file$g, 66, 24, 3138);
    			attr_dev(div20, "class", "road__item-title");
    			add_location(div20, file$g, 68, 28, 3260);
    			add_location(p4, file$g, 71, 28, 3399);
    			attr_dev(div21, "class", "road__item-content");
    			add_location(div21, file$g, 67, 24, 3199);
    			attr_dev(div22, "class", "road__item road__item-active");
    			add_location(div22, file$g, 65, 20, 3071);
    			attr_dev(div23, "class", "road__item-metka");
    			add_location(div23, file$g, 78, 24, 3954);
    			attr_dev(div24, "class", "road__item-title");
    			add_location(div24, file$g, 80, 28, 4076);
    			add_location(p5, file$g, 83, 28, 4213);
    			attr_dev(div25, "class", "road__item-content");
    			add_location(div25, file$g, 79, 24, 4015);
    			attr_dev(div26, "class", "road__item road__item-next");
    			add_location(div26, file$g, 77, 20, 3889);
    			attr_dev(div27, "class", "road__item-metka");
    			add_location(div27, file$g, 90, 24, 4548);
    			attr_dev(div28, "class", "road__item-title");
    			add_location(div28, file$g, 92, 28, 4670);
    			add_location(p6, file$g, 95, 28, 4805);
    			attr_dev(div29, "class", "road__item-content");
    			add_location(div29, file$g, 91, 24, 4609);
    			attr_dev(div30, "class", "road__item road__item-next");
    			add_location(div30, file$g, 89, 20, 4483);
    			attr_dev(div31, "class", "road");
    			add_location(div31, file$g, 13, 16, 489);
    			attr_dev(div32, "class", "col-lg-6 offset-lg-4 col-sm-8 offset-sm-4");
    			add_location(div32, file$g, 11, 12, 416);
    			attr_dev(div33, "class", "row");
    			add_location(div33, file$g, 10, 8, 386);
    			if (!src_url_equal(img.src, img_src_value = "img/road_map.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "data-jarallax-element", "-40");
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "map__title-bg");
    			add_location(img, file$g, 105, 8, 5117);
    			attr_dev(div34, "class", "container");
    			add_location(div34, file$g, 1, 4, 43);
    			attr_dev(section, "class", "section map");
    			attr_dev(section, "id", "map");
    			add_location(section, file$g, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div34);
    			append_dev(div34, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(div34, t3);
    			append_dev(div34, div33);
    			append_dev(div33, div32);
    			append_dev(div32, div31);
    			append_dev(div31, div6);
    			append_dev(div6, div3);
    			append_dev(div6, t4);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div5, t6);
    			append_dev(div5, p0);
    			append_dev(div31, t8);
    			append_dev(div31, div10);
    			append_dev(div10, div7);
    			append_dev(div10, t9);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div9, t11);
    			append_dev(div9, p1);
    			append_dev(div31, t13);
    			append_dev(div31, div14);
    			append_dev(div14, div11);
    			append_dev(div14, t14);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div13, t16);
    			append_dev(div13, p2);
    			append_dev(div31, t18);
    			append_dev(div31, div18);
    			append_dev(div18, div15);
    			append_dev(div18, t19);
    			append_dev(div18, div17);
    			append_dev(div17, div16);
    			append_dev(div17, t21);
    			append_dev(div17, p3);
    			append_dev(div31, t23);
    			append_dev(div31, div22);
    			append_dev(div22, div19);
    			append_dev(div22, t24);
    			append_dev(div22, div21);
    			append_dev(div21, div20);
    			append_dev(div21, t26);
    			append_dev(div21, p4);
    			append_dev(div31, t28);
    			append_dev(div31, div26);
    			append_dev(div26, div23);
    			append_dev(div26, t29);
    			append_dev(div26, div25);
    			append_dev(div25, div24);
    			append_dev(div25, t31);
    			append_dev(div25, p5);
    			append_dev(div31, t33);
    			append_dev(div31, div30);
    			append_dev(div30, div27);
    			append_dev(div30, t34);
    			append_dev(div30, div29);
    			append_dev(div29, div28);
    			append_dev(div29, t36);
    			append_dev(div29, p6);
    			append_dev(div34, t38);
    			append_dev(div34, img);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Roadmap', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Roadmap> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Roadmap extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Roadmap",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* src/inc/feature.svelte generated by Svelte v3.44.0 */

    const file$f = "src/inc/feature.svelte";

    function create_fragment$f(ctx) {
    	let section;
    	let div7;
    	let div6;
    	let div5;
    	let div4;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let p0;
    	let t2;
    	let div1;
    	let img1;
    	let img1_src_value;
    	let t3;
    	let p1;
    	let t5;
    	let div2;
    	let img2;
    	let img2_src_value;
    	let t6;
    	let ul;
    	let li0;
    	let t7;
    	let li1;
    	let t8;
    	let li2;
    	let t9;
    	let li3;
    	let t10;
    	let li4;
    	let t11;
    	let div3;
    	let img3;
    	let img3_src_value;
    	let t12;
    	let p2;
    	let t14;
    	let img4;
    	let img4_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			p0 = element("p");
    			p0.textContent = "Escrow";
    			t2 = space();
    			div1 = element("div");
    			img1 = element("img");
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "risk: low";
    			t5 = space();
    			div2 = element("div");
    			img2 = element("img");
    			t6 = space();
    			ul = element("ul");
    			li0 = element("li");
    			t7 = space();
    			li1 = element("li");
    			t8 = space();
    			li2 = element("li");
    			t9 = space();
    			li3 = element("li");
    			t10 = space();
    			li4 = element("li");
    			t11 = space();
    			div3 = element("div");
    			img3 = element("img");
    			t12 = space();
    			p2 = element("p");
    			p2.textContent = "risk: low";
    			t14 = space();
    			img4 = element("img");
    			if (!src_url_equal(img0.src, img0_src_value = "img/partners-logo-1.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$f, 6, 24, 283);
    			add_location(p0, file$f, 7, 24, 350);
    			attr_dev(div0, "class", "partners-logo__item");
    			add_location(div0, file$f, 5, 20, 225);
    			if (!src_url_equal(img1.src, img1_src_value = "img/partners-logo-2.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$f, 10, 24, 469);
    			add_location(p1, file$f, 11, 24, 536);
    			attr_dev(div1, "class", "partners-logo__item");
    			add_location(div1, file$f, 9, 20, 411);
    			if (!src_url_equal(img2.src, img2_src_value = "img/partners-logo-3.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$f, 14, 24, 658);
    			set_style(li0, "background-image", "url(img/star-gold.svg)");
    			add_location(li0, file$f, 16, 28, 773);
    			set_style(li1, "background-image", "url(img/star-gold.svg)");
    			add_location(li1, file$f, 17, 28, 860);
    			set_style(li2, "background-image", "url(img/star-gold.svg)");
    			add_location(li2, file$f, 18, 28, 947);
    			set_style(li3, "background-image", "url(img/star-gold.svg)");
    			add_location(li3, file$f, 19, 28, 1034);
    			set_style(li4, "background-image", "url(img/star.svg)");
    			add_location(li4, file$f, 20, 28, 1121);
    			attr_dev(ul, "class", "rating");
    			add_location(ul, file$f, 15, 24, 725);
    			attr_dev(div2, "class", "partners-logo__item");
    			add_location(div2, file$f, 13, 20, 600);
    			if (!src_url_equal(img3.src, img3_src_value = "img/partners-logo-4.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$f, 24, 24, 1310);
    			add_location(p2, file$f, 25, 24, 1377);
    			attr_dev(div3, "class", "partners-logo__item");
    			add_location(div3, file$f, 23, 20, 1252);
    			attr_dev(div4, "class", "partners-logo__block");
    			add_location(div4, file$f, 4, 16, 170);
    			attr_dev(div5, "data-aos", "fade-up");
    			attr_dev(div5, "class", "col");
    			add_location(div5, file$f, 3, 12, 117);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file$f, 2, 8, 87);
    			attr_dev(div7, "class", "container");
    			add_location(div7, file$f, 1, 4, 55);
    			if (!src_url_equal(img4.src, img4_src_value = "img/partenrs-bg.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "data-jarallax-element", "20");
    			attr_dev(img4, "alt", "");
    			attr_dev(img4, "class", "partners-logo__bg");
    			add_location(img4, file$f, 32, 4, 1494);
    			attr_dev(section, "class", "partners-logo");
    			attr_dev(section, "id", "partners-logo");
    			add_location(section, file$f, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div0);
    			append_dev(div0, img0);
    			append_dev(div0, t0);
    			append_dev(div0, p0);
    			append_dev(div4, t2);
    			append_dev(div4, div1);
    			append_dev(div1, img1);
    			append_dev(div1, t3);
    			append_dev(div1, p1);
    			append_dev(div4, t5);
    			append_dev(div4, div2);
    			append_dev(div2, img2);
    			append_dev(div2, t6);
    			append_dev(div2, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t7);
    			append_dev(ul, li1);
    			append_dev(ul, t8);
    			append_dev(ul, li2);
    			append_dev(ul, t9);
    			append_dev(ul, li3);
    			append_dev(ul, t10);
    			append_dev(ul, li4);
    			append_dev(div4, t11);
    			append_dev(div4, div3);
    			append_dev(div3, img3);
    			append_dev(div3, t12);
    			append_dev(div3, p2);
    			append_dev(section, t14);
    			append_dev(section, img4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Feature', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Feature> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Feature extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Feature",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src/inc/usecase.svelte generated by Svelte v3.44.0 */

    const file$e = "src/inc/usecase.svelte";

    function create_fragment$e(ctx) {
    	let section;
    	let div24;
    	let div2;
    	let div1;
    	let div0;
    	let h4;
    	let t1;
    	let h2;
    	let t3;
    	let div22;
    	let div21;
    	let div5;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let div4;
    	let div3;
    	let t6;
    	let p0;
    	let t8;
    	let div8;
    	let img1;
    	let img1_src_value;
    	let t9;
    	let div7;
    	let div6;
    	let t11;
    	let p1;
    	let t13;
    	let div11;
    	let img2;
    	let img2_src_value;
    	let t14;
    	let div10;
    	let div9;
    	let t16;
    	let p2;
    	let t18;
    	let div14;
    	let img3;
    	let img3_src_value;
    	let t19;
    	let div13;
    	let div12;
    	let t21;
    	let p3;
    	let t23;
    	let div17;
    	let img4;
    	let img4_src_value;
    	let t24;
    	let div16;
    	let div15;
    	let t26;
    	let p4;
    	let t28;
    	let div20;
    	let img5;
    	let img5_src_value;
    	let t29;
    	let div19;
    	let div18;
    	let t31;
    	let p5;
    	let t33;
    	let div23;
    	let a;
    	let span;
    	let t35;
    	let img6;
    	let img6_src_value;
    	let t36;
    	let img7;
    	let img7_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div24 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Some facts";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Use Cases";
    			t3 = space();
    			div22 = element("div");
    			div21 = element("div");
    			div5 = element("div");
    			img0 = element("img");
    			t4 = space();
    			div4 = element("div");
    			div3 = element("div");
    			div3.textContent = "Cryptoland App";
    			t6 = space();
    			p0 = element("p");
    			p0.textContent = "Asiatic glassfish pilchard sandburrower, orangestriped triggerfish hamlet Molly Miller trunkfish spiny dogfish! Jewel tetra frigate mackerel";
    			t8 = space();
    			div8 = element("div");
    			img1 = element("img");
    			t9 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div6.textContent = "Mining Service";
    			t11 = space();
    			p1 = element("p");
    			p1.textContent = "Spend real fights effective anything extra by leading. Mouthwatering leading how real formula also locked-in have can mountain thought. Jumbo";
    			t13 = space();
    			div11 = element("div");
    			img2 = element("img");
    			t14 = space();
    			div10 = element("div");
    			div9 = element("div");
    			div9.textContent = "Blockchain";
    			t16 = space();
    			p2 = element("p");
    			p2.textContent = "Clownfish catfish antenna codlet alfonsino squirrelfish deepwater flathead sea lamprey. Bombay duck sand goby snake mudhead";
    			t18 = space();
    			div14 = element("div");
    			img3 = element("img");
    			t19 = space();
    			div13 = element("div");
    			div12 = element("div");
    			div12.textContent = "Exchange";
    			t21 = space();
    			p3 = element("p");
    			p3.textContent = "Barbelless catfish pelican gulper candlefish thornfishGulf menhaden ribbonbearer riffle dace black dragonfish denticle herring";
    			t23 = space();
    			div17 = element("div");
    			img4 = element("img");
    			t24 = space();
    			div16 = element("div");
    			div15 = element("div");
    			div15.textContent = "Cryptoland";
    			t26 = space();
    			p4 = element("p");
    			p4.textContent = "Clownfish catfish antenna codlet alfonsino squirrelfish deepwater flathead sea lamprey. Bombay duck sand goby snake mudhead";
    			t28 = space();
    			div20 = element("div");
    			img5 = element("img");
    			t29 = space();
    			div19 = element("div");
    			div18 = element("div");
    			div18.textContent = "Cryptoland App";
    			t31 = space();
    			p5 = element("p");
    			p5.textContent = "Asiatic glassfish pilchard sandburrower, orangestriped triggerfish hamlet Molly Miller trunkfish spiny dogfish!";
    			t33 = space();
    			div23 = element("div");
    			a = element("a");
    			span = element("span");
    			span.textContent = "Join ICO";
    			t35 = space();
    			img6 = element("img");
    			t36 = space();
    			img7 = element("img");
    			add_location(h4, file$e, 6, 20, 260);
    			add_location(h2, file$e, 7, 20, 300);
    			attr_dev(div0, "class", "section-header section-header--animated section-header--center section-header--medium-margin");
    			add_location(div0, file$e, 5, 16, 133);
    			attr_dev(div1, "class", "col");
    			add_location(div1, file$e, 4, 12, 99);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$e, 3, 8, 69);
    			if (!src_url_equal(img0.src, img0_src_value = "img/cases-icon-1.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			attr_dev(img0, "class", "cases__item-icon");
    			add_location(img0, file$e, 14, 20, 528);
    			attr_dev(div3, "class", "cases__item-title");
    			add_location(div3, file$e, 16, 24, 671);
    			attr_dev(p0, "class", "cases__item-text");
    			add_location(p0, file$e, 19, 24, 801);
    			attr_dev(div4, "class", "cases__item-content");
    			add_location(div4, file$e, 15, 20, 613);
    			attr_dev(div5, "data-aos", "fade-right");
    			attr_dev(div5, "class", "cases__item");
    			add_location(div5, file$e, 13, 16, 460);
    			if (!src_url_equal(img1.src, img1_src_value = "img/cases-icon-2.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			attr_dev(img1, "class", "cases__item-icon");
    			add_location(img1, file$e, 25, 20, 1182);
    			attr_dev(div6, "class", "cases__item-title");
    			add_location(div6, file$e, 27, 24, 1325);
    			attr_dev(p1, "class", "cases__item-text");
    			add_location(p1, file$e, 30, 24, 1455);
    			attr_dev(div7, "class", "cases__item-content");
    			add_location(div7, file$e, 26, 20, 1267);
    			attr_dev(div8, "data-aos", "fade-left");
    			attr_dev(div8, "data-aos-delay", "200");
    			attr_dev(div8, "class", "cases__item");
    			add_location(div8, file$e, 24, 16, 1094);
    			if (!src_url_equal(img2.src, img2_src_value = "img/cases-icon-3.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			attr_dev(img2, "class", "cases__item-icon");
    			add_location(img2, file$e, 36, 20, 1817);
    			attr_dev(div9, "class", "cases__item-title");
    			add_location(div9, file$e, 38, 24, 1960);
    			attr_dev(p2, "class", "cases__item-text");
    			add_location(p2, file$e, 41, 24, 2086);
    			attr_dev(div10, "class", "cases__item-content");
    			add_location(div10, file$e, 37, 20, 1902);
    			attr_dev(div11, "data-aos", "fade-right");
    			attr_dev(div11, "class", "cases__item");
    			add_location(div11, file$e, 35, 16, 1749);
    			if (!src_url_equal(img3.src, img3_src_value = "img/cases-icon-4.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			attr_dev(img3, "class", "cases__item-icon");
    			add_location(img3, file$e, 47, 20, 2450);
    			attr_dev(div12, "class", "cases__item-title");
    			add_location(div12, file$e, 49, 24, 2593);
    			attr_dev(p3, "class", "cases__item-text");
    			add_location(p3, file$e, 52, 24, 2717);
    			attr_dev(div13, "class", "cases__item-content");
    			add_location(div13, file$e, 48, 20, 2535);
    			attr_dev(div14, "data-aos", "fade-left");
    			attr_dev(div14, "data-aos-delay", "200");
    			attr_dev(div14, "class", "cases__item");
    			add_location(div14, file$e, 46, 16, 2362);
    			if (!src_url_equal(img4.src, img4_src_value = "img/cases-icon-5.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			attr_dev(img4, "class", "cases__item-icon");
    			add_location(img4, file$e, 58, 20, 3064);
    			attr_dev(div15, "class", "cases__item-title");
    			add_location(div15, file$e, 60, 24, 3207);
    			attr_dev(p4, "class", "cases__item-text");
    			add_location(p4, file$e, 63, 24, 3333);
    			attr_dev(div16, "class", "cases__item-content");
    			add_location(div16, file$e, 59, 20, 3149);
    			attr_dev(div17, "data-aos", "fade-right");
    			attr_dev(div17, "class", "cases__item");
    			add_location(div17, file$e, 57, 16, 2996);
    			if (!src_url_equal(img5.src, img5_src_value = "img/cases-icon-6.png")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "");
    			attr_dev(img5, "class", "cases__item-icon");
    			add_location(img5, file$e, 69, 20, 3697);
    			attr_dev(div18, "class", "cases__item-title");
    			add_location(div18, file$e, 71, 24, 3840);
    			attr_dev(p5, "class", "cases__item-text");
    			add_location(p5, file$e, 74, 24, 3970);
    			attr_dev(div19, "class", "cases__item-content");
    			add_location(div19, file$e, 70, 20, 3782);
    			attr_dev(div20, "data-aos", "fade-left");
    			attr_dev(div20, "data-aos-delay", "200");
    			attr_dev(div20, "class", "cases__item");
    			add_location(div20, file$e, 68, 16, 3609);
    			attr_dev(div21, "class", "col cases__list");
    			add_location(div21, file$e, 12, 12, 414);
    			attr_dev(div22, "class", "row");
    			add_location(div22, file$e, 11, 8, 384);
    			add_location(span, file$e, 82, 63, 4341);
    			attr_dev(a, "href", "#");
    			attr_dev(a, "class", "btn btn--orange btn--uppercase");
    			add_location(a, file$e, 82, 12, 4290);
    			attr_dev(div23, "class", "row");
    			add_location(div23, file$e, 81, 8, 4260);
    			attr_dev(div24, "class", "container");
    			add_location(div24, file$e, 2, 4, 37);
    			if (!src_url_equal(img6.src, img6_src_value = "img/cases-bg.png")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "class", "cases__bg");
    			attr_dev(img6, "alt", "");
    			add_location(img6, file$e, 85, 4, 4397);
    			if (!src_url_equal(img7.src, img7_src_value = "img/cases-imgs.png")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "class", "cases__elements");
    			attr_dev(img7, "alt", "");
    			add_location(img7, file$e, 86, 4, 4456);
    			attr_dev(section, "class", "section cases");
    			add_location(section, file$e, 1, 0, 1);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div24);
    			append_dev(div24, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(div24, t3);
    			append_dev(div24, div22);
    			append_dev(div22, div21);
    			append_dev(div21, div5);
    			append_dev(div5, img0);
    			append_dev(div5, t4);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div4, t6);
    			append_dev(div4, p0);
    			append_dev(div21, t8);
    			append_dev(div21, div8);
    			append_dev(div8, img1);
    			append_dev(div8, t9);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div7, t11);
    			append_dev(div7, p1);
    			append_dev(div21, t13);
    			append_dev(div21, div11);
    			append_dev(div11, img2);
    			append_dev(div11, t14);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div10, t16);
    			append_dev(div10, p2);
    			append_dev(div21, t18);
    			append_dev(div21, div14);
    			append_dev(div14, img3);
    			append_dev(div14, t19);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div13, t21);
    			append_dev(div13, p3);
    			append_dev(div21, t23);
    			append_dev(div21, div17);
    			append_dev(div17, img4);
    			append_dev(div17, t24);
    			append_dev(div17, div16);
    			append_dev(div16, div15);
    			append_dev(div16, t26);
    			append_dev(div16, p4);
    			append_dev(div21, t28);
    			append_dev(div21, div20);
    			append_dev(div20, img5);
    			append_dev(div20, t29);
    			append_dev(div20, div19);
    			append_dev(div19, div18);
    			append_dev(div19, t31);
    			append_dev(div19, p5);
    			append_dev(div24, t33);
    			append_dev(div24, div23);
    			append_dev(div23, a);
    			append_dev(a, span);
    			append_dev(section, t35);
    			append_dev(section, img6);
    			append_dev(section, t36);
    			append_dev(section, img7);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Usecase', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Usecase> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Usecase extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Usecase",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src/inc/stat.svelte generated by Svelte v3.44.0 */

    const file$d = "src/inc/stat.svelte";

    function create_fragment$d(ctx) {
    	let section;
    	let div14;
    	let div13;
    	let div12;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div2;
    	let div0;
    	let t2;
    	let div1;
    	let t4;
    	let div5;
    	let div3;
    	let t6;
    	let div4;
    	let t8;
    	let div8;
    	let div6;
    	let t10;
    	let div7;
    	let t12;
    	let div11;
    	let div9;
    	let t14;
    	let div10;
    	let t16;
    	let img1;
    	let img1_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div14 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Current elixit price (BTC)";
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "0.052646";
    			t4 = space();
    			div5 = element("div");
    			div3 = element("div");
    			div3.textContent = "Avarage batches used";
    			t6 = space();
    			div4 = element("div");
    			div4.textContent = "5.658";
    			t8 = space();
    			div8 = element("div");
    			div6 = element("div");
    			div6.textContent = "Total batches remaining";
    			t10 = space();
    			div7 = element("div");
    			div7.textContent = "20.324";
    			t12 = space();
    			div11 = element("div");
    			div9 = element("div");
    			div9.textContent = "Percentage batches";
    			t14 = space();
    			div10 = element("div");
    			div10.textContent = "65";
    			t16 = space();
    			img1 = element("img");
    			if (!src_url_equal(img0.src, img0_src_value = "img/data-bg.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "data__img");
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$d, 4, 5, 124);
    			attr_dev(div0, "class", "counter__item-title");
    			add_location(div0, file$d, 6, 6, 232);
    			attr_dev(div1, "class", "counter counter__item-value counter__item-value--blue numscroller");
    			add_location(div1, file$d, 7, 6, 304);
    			attr_dev(div2, "class", "counter__item counter__item-1");
    			add_location(div2, file$d, 5, 5, 182);
    			attr_dev(div3, "class", "counter__item-title");
    			add_location(div3, file$d, 10, 6, 465);
    			attr_dev(div4, "class", "counter counter__item-value counter__item-value--pink");
    			add_location(div4, file$d, 11, 6, 531);
    			attr_dev(div5, "class", "counter__item counter__item-2");
    			add_location(div5, file$d, 9, 5, 415);
    			attr_dev(div6, "class", "counter__item-title");
    			add_location(div6, file$d, 14, 6, 677);
    			attr_dev(div7, "class", "counter counter__item-value counter__item-value--green");
    			add_location(div7, file$d, 15, 6, 746);
    			attr_dev(div8, "class", "counter__item counter__item-3");
    			add_location(div8, file$d, 13, 5, 627);
    			attr_dev(div9, "class", "counter__item-title");
    			add_location(div9, file$d, 18, 6, 894);
    			attr_dev(div10, "class", "counter counter__item-value counter__item-value--percent counter__item-value--purpure");
    			add_location(div10, file$d, 19, 6, 958);
    			attr_dev(div11, "class", "counter__item counter__item-4");
    			add_location(div11, file$d, 17, 5, 844);
    			attr_dev(div12, "class", "col");
    			add_location(div12, file$d, 3, 4, 101);
    			attr_dev(div13, "class", "row");
    			add_location(div13, file$d, 2, 3, 79);
    			attr_dev(div14, "class", "container data__container");
    			add_location(div14, file$d, 1, 2, 36);
    			if (!src_url_equal(img1.src, img1_src_value = "img/data-bg-space.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "data__bg");
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$d, 24, 2, 1110);
    			attr_dev(section, "class", "data");
    			attr_dev(section, "id", "stat");
    			add_location(section, file$d, 0, 1, 1);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, img0);
    			append_dev(div12, t0);
    			append_dev(div12, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div12, t4);
    			append_dev(div12, div5);
    			append_dev(div5, div3);
    			append_dev(div5, t6);
    			append_dev(div5, div4);
    			append_dev(div12, t8);
    			append_dev(div12, div8);
    			append_dev(div8, div6);
    			append_dev(div8, t10);
    			append_dev(div8, div7);
    			append_dev(div12, t12);
    			append_dev(div12, div11);
    			append_dev(div11, div9);
    			append_dev(div11, t14);
    			append_dev(div11, div10);
    			append_dev(section, t16);
    			append_dev(section, img1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Stat', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Stat> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Stat extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Stat",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src/inc/fact.svelte generated by Svelte v3.44.0 */

    const file$c = "src/inc/fact.svelte";

    function create_fragment$c(ctx) {
    	let section;
    	let div3;
    	let div2;
    	let div1;
    	let div0;
    	let h4;
    	let t1;
    	let h2;
    	let t3;
    	let div18;
    	let div17;
    	let div16;
    	let div15;
    	let div14;
    	let div5;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let div4;
    	let t6;
    	let div7;
    	let img1;
    	let img1_src_value;
    	let t7;
    	let div6;
    	let t9;
    	let div9;
    	let img2;
    	let img2_src_value;
    	let t10;
    	let div8;
    	let t12;
    	let div11;
    	let img3;
    	let img3_src_value;
    	let t13;
    	let div10;
    	let t15;
    	let div13;
    	let img4;
    	let img4_src_value;
    	let t16;
    	let div12;
    	let t18;
    	let img5;
    	let img5_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Some facts";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Smart Contract API";
    			t3 = space();
    			div18 = element("div");
    			div17 = element("div");
    			div16 = element("div");
    			div15 = element("div");
    			div14 = element("div");
    			div5 = element("div");
    			img0 = element("img");
    			t4 = space();
    			div4 = element("div");
    			div4.textContent = "Bitcoin + RSK";
    			t6 = space();
    			div7 = element("div");
    			img1 = element("img");
    			t7 = space();
    			div6 = element("div");
    			div6.textContent = "Stellar Lumens";
    			t9 = space();
    			div9 = element("div");
    			img2 = element("img");
    			t10 = space();
    			div8 = element("div");
    			div8.textContent = "Counterparty";
    			t12 = space();
    			div11 = element("div");
    			img3 = element("img");
    			t13 = space();
    			div10 = element("div");
    			div10.textContent = "Lisk";
    			t15 = space();
    			div13 = element("div");
    			img4 = element("img");
    			t16 = space();
    			div12 = element("div");
    			div12.textContent = "EOS";
    			t18 = space();
    			img5 = element("img");
    			add_location(h4, file$c, 5, 20, 278);
    			add_location(h2, file$c, 6, 20, 318);
    			attr_dev(div0, "class", "section-header section-header--animated section-header--center section-header--small-margin");
    			add_location(div0, file$c, 4, 16, 152);
    			attr_dev(div1, "class", "col");
    			add_location(div1, file$c, 3, 12, 118);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$c, 2, 8, 88);
    			attr_dev(div3, "class", "container");
    			add_location(div3, file$c, 1, 4, 56);
    			if (!src_url_equal(img0.src, img0_src_value = "img/bitcon-round.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "facts__icon");
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$c, 17, 32, 673);
    			attr_dev(div4, "class", "facts__title");
    			add_location(div4, file$c, 18, 32, 765);
    			attr_dev(div5, "class", "facts__item");
    			add_location(div5, file$c, 16, 24, 615);
    			if (!src_url_equal(img1.src, img1_src_value = "img/stellar-round.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "facts__icon");
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$c, 23, 32, 1002);
    			attr_dev(div6, "class", "facts__title");
    			add_location(div6, file$c, 24, 32, 1095);
    			attr_dev(div7, "class", "facts__item");
    			add_location(div7, file$c, 22, 28, 944);
    			if (!src_url_equal(img2.src, img2_src_value = "img/counterparty-round.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "facts__icon");
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$c, 29, 32, 1333);
    			attr_dev(div8, "class", "facts__title");
    			add_location(div8, file$c, 30, 32, 1431);
    			attr_dev(div9, "class", "facts__item");
    			add_location(div9, file$c, 28, 28, 1275);
    			if (!src_url_equal(img3.src, img3_src_value = "img/lisk.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "facts__icon");
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$c, 35, 32, 1667);
    			attr_dev(div10, "class", "facts__title");
    			add_location(div10, file$c, 36, 32, 1751);
    			attr_dev(div11, "class", "facts__item");
    			add_location(div11, file$c, 34, 28, 1609);
    			if (!src_url_equal(img4.src, img4_src_value = "img/eos-round.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "class", "facts__icon");
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$c, 41, 32, 1979);
    			attr_dev(div12, "class", "facts__title");
    			add_location(div12, file$c, 42, 32, 2068);
    			attr_dev(div13, "class", "facts__item");
    			add_location(div13, file$c, 40, 28, 1921);
    			attr_dev(div14, "class", "facts__line-list");
    			add_location(div14, file$c, 15, 20, 560);
    			attr_dev(div15, "class", "col");
    			add_location(div15, file$c, 14, 16, 522);
    			attr_dev(div16, "class", "row");
    			add_location(div16, file$c, 13, 12, 488);
    			attr_dev(div17, "class", "container");
    			add_location(div17, file$c, 12, 8, 452);
    			if (!src_url_equal(img5.src, img5_src_value = "img/facts-bg.png")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "class", "facts__bg");
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$c, 50, 8, 2301);
    			attr_dev(div18, "class", "facts__line");
    			add_location(div18, file$c, 11, 4, 418);
    			attr_dev(section, "class", "section section--no-pad-bot facts");
    			add_location(section, file$c, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(section, t3);
    			append_dev(section, div18);
    			append_dev(div18, div17);
    			append_dev(div17, div16);
    			append_dev(div16, div15);
    			append_dev(div15, div14);
    			append_dev(div14, div5);
    			append_dev(div5, img0);
    			append_dev(div5, t4);
    			append_dev(div5, div4);
    			append_dev(div14, t6);
    			append_dev(div14, div7);
    			append_dev(div7, img1);
    			append_dev(div7, t7);
    			append_dev(div7, div6);
    			append_dev(div14, t9);
    			append_dev(div14, div9);
    			append_dev(div9, img2);
    			append_dev(div9, t10);
    			append_dev(div9, div8);
    			append_dev(div14, t12);
    			append_dev(div14, div11);
    			append_dev(div11, img3);
    			append_dev(div11, t13);
    			append_dev(div11, div10);
    			append_dev(div14, t15);
    			append_dev(div14, div13);
    			append_dev(div13, img4);
    			append_dev(div13, t16);
    			append_dev(div13, div12);
    			append_dev(div18, t18);
    			append_dev(div18, img5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Fact', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Fact> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Fact extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Fact",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/inc/token.svelte generated by Svelte v3.44.0 */

    const file$b = "src/inc/token.svelte";

    function create_fragment$b(ctx) {
    	let section;
    	let div6;
    	let div5;
    	let img;
    	let img_src_value;
    	let t0;
    	let div4;
    	let div0;
    	let h4;
    	let t2;
    	let h2;
    	let t4;
    	let ul;
    	let li0;
    	let span0;
    	let t6;
    	let t7;
    	let li1;
    	let span1;
    	let t9;
    	let t10;
    	let li2;
    	let span2;
    	let t12;
    	let t13;
    	let li3;
    	let span3;
    	let t15;
    	let t16;
    	let li4;
    	let span4;
    	let t18;
    	let t19;
    	let li5;
    	let span5;
    	let t21;
    	let t22;
    	let li6;
    	let span6;
    	let t24;
    	let t25;
    	let li7;
    	let span7;
    	let t27;
    	let t28;
    	let div3;
    	let div1;
    	let t30;
    	let div2;
    	let p0;
    	let t32;
    	let p1;
    	let t34;
    	let a;
    	let span8;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div6 = element("div");
    			div5 = element("div");
    			img = element("img");
    			t0 = space();
    			div4 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "About token";
    			t2 = space();
    			h2 = element("h2");
    			h2.textContent = "Token Sale";
    			t4 = space();
    			ul = element("ul");
    			li0 = element("li");
    			span0 = element("span");
    			span0.textContent = "Token name:";
    			t6 = text(" Cryptoland Token");
    			t7 = space();
    			li1 = element("li");
    			span1 = element("span");
    			span1.textContent = "Ticker Symbol:";
    			t9 = text(" Cryptoland");
    			t10 = space();
    			li2 = element("li");
    			span2 = element("span");
    			span2.textContent = "Currency Symbol Image\t:";
    			t12 = text(" Currency Symbol Image");
    			t13 = space();
    			li3 = element("li");
    			span3 = element("span");
    			span3.textContent = "Starting Price Pre-ICO:";
    			t15 = text(" Cryptoland for USD 0.08");
    			t16 = space();
    			li4 = element("li");
    			span4 = element("span");
    			span4.textContent = "Maximum Eroiy produced:";
    			t18 = text(" Cryptoland for USD 0.12");
    			t19 = space();
    			li5 = element("li");
    			span5 = element("span");
    			span5.textContent = "Maximum Eroiy for Sale:";
    			t21 = text(" 2 billion (technical limit)");
    			t22 = space();
    			li6 = element("li");
    			span6 = element("span");
    			span6.textContent = "Fundraising Goal:";
    			t24 = text(" USD 48 million");
    			t25 = space();
    			li7 = element("li");
    			span7 = element("span");
    			span7.textContent = "Minimum Purchase:";
    			t27 = text(" 100 Cryptoland");
    			t28 = space();
    			div3 = element("div");
    			div1 = element("div");
    			div1.textContent = "General description";
    			t30 = space();
    			div2 = element("div");
    			p0 = element("p");
    			p0.textContent = "Cryptoland will be released on the basis of Ethereum platform and fully comply with ERC20* standard.";
    			t32 = space();
    			p1 = element("p");
    			p1.textContent = "Support of this standard guarantees the compatibility of the token with third-party services (wallets, exchanges, listings, etc.), and provides easy integration.";
    			t34 = space();
    			a = element("a");
    			span8 = element("span");
    			span8.textContent = "Buy Token";
    			if (!src_url_equal(img.src, img_src_value = "img/token-img.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "token__img");
    			attr_dev(img, "alt", "");
    			add_location(img, file$b, 3, 12, 109);
    			add_location(h4, file$b, 6, 20, 372);
    			add_location(h2, file$b, 7, 20, 413);
    			attr_dev(div0, "class", "section-header section-header--tire section-header--small-margin");
    			add_location(div0, file$b, 5, 16, 273);
    			add_location(span0, file$b, 12, 24, 552);
    			add_location(li0, file$b, 11, 20, 523);
    			add_location(span1, file$b, 15, 24, 669);
    			add_location(li1, file$b, 14, 20, 640);
    			add_location(span2, file$b, 18, 24, 783);
    			add_location(li2, file$b, 17, 20, 754);
    			add_location(span3, file$b, 21, 24, 917);
    			add_location(li3, file$b, 20, 20, 888);
    			add_location(span4, file$b, 24, 24, 1053);
    			add_location(li4, file$b, 23, 20, 1024);
    			add_location(span5, file$b, 27, 24, 1189);
    			add_location(li5, file$b, 26, 20, 1160);
    			add_location(span6, file$b, 30, 24, 1329);
    			add_location(li6, file$b, 29, 20, 1300);
    			add_location(span7, file$b, 33, 24, 1450);
    			add_location(li7, file$b, 32, 20, 1421);
    			attr_dev(ul, "class", "token__info-list");
    			add_location(ul, file$b, 10, 16, 473);
    			attr_dev(div1, "class", "token__desc-title");
    			add_location(div1, file$b, 38, 20, 1607);
    			add_location(p0, file$b, 40, 24, 1739);
    			add_location(p1, file$b, 43, 24, 1925);
    			attr_dev(div2, "class", "token__desc-text");
    			add_location(div2, file$b, 39, 20, 1684);
    			attr_dev(div3, "class", "token__desc");
    			add_location(div3, file$b, 37, 16, 1561);
    			add_location(span8, file$b, 49, 78, 2277);
    			attr_dev(a, "href", "#");
    			attr_dev(a, "class", "btn btn--small btn--uppercase btn--orange");
    			add_location(a, file$b, 49, 16, 2215);
    			attr_dev(div4, "data-aos", "fade-left");
    			attr_dev(div4, "class", "col-lg-6 offset-lg-6 token__animated-content");
    			add_location(div4, file$b, 4, 12, 177);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$b, 2, 8, 79);
    			attr_dev(div6, "class", "container");
    			add_location(div6, file$b, 1, 4, 47);
    			attr_dev(section, "class", "section token");
    			attr_dev(section, "id", "token");
    			add_location(section, file$b, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div6);
    			append_dev(div6, div5);
    			append_dev(div5, img);
    			append_dev(div5, t0);
    			append_dev(div5, div4);
    			append_dev(div4, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t2);
    			append_dev(div0, h2);
    			append_dev(div4, t4);
    			append_dev(div4, ul);
    			append_dev(ul, li0);
    			append_dev(li0, span0);
    			append_dev(li0, t6);
    			append_dev(ul, t7);
    			append_dev(ul, li1);
    			append_dev(li1, span1);
    			append_dev(li1, t9);
    			append_dev(ul, t10);
    			append_dev(ul, li2);
    			append_dev(li2, span2);
    			append_dev(li2, t12);
    			append_dev(ul, t13);
    			append_dev(ul, li3);
    			append_dev(li3, span3);
    			append_dev(li3, t15);
    			append_dev(ul, t16);
    			append_dev(ul, li4);
    			append_dev(li4, span4);
    			append_dev(li4, t18);
    			append_dev(ul, t19);
    			append_dev(ul, li5);
    			append_dev(li5, span5);
    			append_dev(li5, t21);
    			append_dev(ul, t22);
    			append_dev(ul, li6);
    			append_dev(li6, span6);
    			append_dev(li6, t24);
    			append_dev(ul, t25);
    			append_dev(ul, li7);
    			append_dev(li7, span7);
    			append_dev(li7, t27);
    			append_dev(div4, t28);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div3, t30);
    			append_dev(div3, div2);
    			append_dev(div2, p0);
    			append_dev(div2, t32);
    			append_dev(div2, p1);
    			append_dev(div4, t34);
    			append_dev(div4, a);
    			append_dev(a, span8);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Token', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Token> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Token extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Token",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/inc/docs.svelte generated by Svelte v3.44.0 */

    const file$a = "src/inc/docs.svelte";

    function create_fragment$a(ctx) {
    	let section;
    	let div16;
    	let div2;
    	let div1;
    	let div0;
    	let h4;
    	let t1;
    	let h2;
    	let t3;
    	let div15;
    	let div5;
    	let a0;
    	let div4;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let div3;
    	let t6;
    	let div8;
    	let a1;
    	let div7;
    	let img1;
    	let img1_src_value;
    	let t7;
    	let div6;
    	let t9;
    	let div11;
    	let a2;
    	let div10;
    	let img2;
    	let img2_src_value;
    	let t10;
    	let div9;
    	let t12;
    	let div14;
    	let a3;
    	let div13;
    	let img3;
    	let img3_src_value;
    	let t13;
    	let div12;
    	let t15;
    	let img4;
    	let img4_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div16 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Our files";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Documents";
    			t3 = space();
    			div15 = element("div");
    			div5 = element("div");
    			a0 = element("a");
    			div4 = element("div");
    			img0 = element("img");
    			t4 = space();
    			div3 = element("div");
    			div3.textContent = "Terms & Conditions";
    			t6 = space();
    			div8 = element("div");
    			a1 = element("a");
    			div7 = element("div");
    			img1 = element("img");
    			t7 = space();
    			div6 = element("div");
    			div6.textContent = "White Pappers";
    			t9 = space();
    			div11 = element("div");
    			a2 = element("a");
    			div10 = element("div");
    			img2 = element("img");
    			t10 = space();
    			div9 = element("div");
    			div9.textContent = "Privacy Policy";
    			t12 = space();
    			div14 = element("div");
    			a3 = element("a");
    			div13 = element("div");
    			img3 = element("img");
    			t13 = space();
    			div12 = element("div");
    			div12.textContent = "Business Profile";
    			t15 = space();
    			img4 = element("img");
    			add_location(h4, file$a, 5, 6, 243);
    			add_location(h2, file$a, 6, 6, 268);
    			attr_dev(div0, "class", "section-header section-header--animated seaction-header--center section-header--tire section-header--medium-margin");
    			add_location(div0, file$a, 4, 5, 108);
    			attr_dev(div1, "class", "col");
    			add_location(div1, file$a, 3, 4, 85);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$a, 2, 3, 63);
    			if (!src_url_equal(img0.src, img0_src_value = "img/pdf.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$a, 14, 7, 482);
    			attr_dev(div3, "class", "doc__title");
    			add_location(div3, file$a, 15, 7, 520);
    			attr_dev(div4, "class", "doc__content");
    			add_location(div4, file$a, 13, 6, 448);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "doc");
    			add_location(a0, file$a, 12, 5, 417);
    			attr_dev(div5, "data-aos", "fade-up");
    			attr_dev(div5, "class", "col-lg-3 col-md-6 col-sm-6 col-12");
    			add_location(div5, file$a, 11, 4, 345);
    			if (!src_url_equal(img1.src, img1_src_value = "img/pdf.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$a, 24, 7, 782);
    			attr_dev(div6, "class", "doc__title");
    			add_location(div6, file$a, 25, 7, 820);
    			attr_dev(div7, "class", "doc__content");
    			add_location(div7, file$a, 23, 6, 748);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "doc");
    			add_location(a1, file$a, 22, 5, 717);
    			attr_dev(div8, "data-aos", "fade-up");
    			attr_dev(div8, "data-aos-delay", "200");
    			attr_dev(div8, "class", "col-lg-3 col-md-6 col-sm-6 col-12");
    			add_location(div8, file$a, 21, 4, 624);
    			if (!src_url_equal(img2.src, img2_src_value = "img/pdf.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$a, 34, 7, 1077);
    			attr_dev(div9, "class", "doc__title");
    			add_location(div9, file$a, 35, 7, 1115);
    			attr_dev(div10, "class", "doc__content");
    			add_location(div10, file$a, 33, 6, 1043);
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "class", "doc");
    			add_location(a2, file$a, 32, 5, 1012);
    			attr_dev(div11, "data-aos", "fade-up");
    			attr_dev(div11, "data-aos-delay", "400");
    			attr_dev(div11, "class", "col-lg-3 col-md-6 col-sm-6 col-12");
    			add_location(div11, file$a, 31, 4, 919);
    			if (!src_url_equal(img3.src, img3_src_value = "img/pdf.svg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$a, 44, 7, 1373);
    			attr_dev(div12, "class", "doc__title");
    			add_location(div12, file$a, 45, 7, 1411);
    			attr_dev(div13, "class", "doc__content");
    			add_location(div13, file$a, 43, 6, 1339);
    			attr_dev(a3, "href", "#");
    			attr_dev(a3, "class", "doc");
    			add_location(a3, file$a, 42, 5, 1308);
    			attr_dev(div14, "data-aos", "fade-up");
    			attr_dev(div14, "data-aos-delay", "600");
    			attr_dev(div14, "class", "col-lg-3 col-md-6 col-sm-6 col-12");
    			add_location(div14, file$a, 41, 4, 1215);
    			attr_dev(div15, "class", "row");
    			add_location(div15, file$a, 10, 3, 323);
    			attr_dev(div16, "class", "container");
    			add_location(div16, file$a, 1, 2, 36);
    			if (!src_url_equal(img4.src, img4_src_value = "img/docs-bg.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "data-jarallax-element", "40");
    			attr_dev(img4, "alt", "");
    			attr_dev(img4, "class", "docs__bg");
    			add_location(img4, file$a, 53, 2, 1530);
    			attr_dev(section, "class", "docs");
    			attr_dev(section, "id", "docs");
    			add_location(section, file$a, 0, 1, 1);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div16);
    			append_dev(div16, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(div16, t3);
    			append_dev(div16, div15);
    			append_dev(div15, div5);
    			append_dev(div5, a0);
    			append_dev(a0, div4);
    			append_dev(div4, img0);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			append_dev(div15, t6);
    			append_dev(div15, div8);
    			append_dev(div8, a1);
    			append_dev(a1, div7);
    			append_dev(div7, img1);
    			append_dev(div7, t7);
    			append_dev(div7, div6);
    			append_dev(div15, t9);
    			append_dev(div15, div11);
    			append_dev(div11, a2);
    			append_dev(a2, div10);
    			append_dev(div10, img2);
    			append_dev(div10, t10);
    			append_dev(div10, div9);
    			append_dev(div15, t12);
    			append_dev(div15, div14);
    			append_dev(div14, a3);
    			append_dev(a3, div13);
    			append_dev(div13, img3);
    			append_dev(div13, t13);
    			append_dev(div13, div12);
    			append_dev(section, t15);
    			append_dev(section, img4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Docs', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Docs> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Docs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Docs",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/inc/data.svelte generated by Svelte v3.44.0 */

    const file$9 = "src/inc/data.svelte";

    function create_fragment$9(ctx) {
    	let section;
    	let div10;
    	let div3;
    	let div2;
    	let div1;
    	let h4;
    	let t1;
    	let h2;
    	let t3;
    	let div0;
    	let t5;
    	let div9;
    	let div6;
    	let div5;
    	let img;
    	let img_src_value;
    	let t6;
    	let div4;
    	let canvas;
    	let t7;
    	let div8;
    	let div7;
    	let t9;
    	let p;
    	let t11;
    	let ul;
    	let li0;
    	let span0;
    	let t12;
    	let t13;
    	let li1;
    	let span1;
    	let t14;
    	let t15;
    	let li2;
    	let span2;
    	let t16;
    	let t17;
    	let li3;
    	let span3;
    	let t18;
    	let t19;
    	let li4;
    	let span4;
    	let t20;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div10 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Our data";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Token Distribution";
    			t3 = space();
    			div0 = element("div");
    			div0.textContent = "Token Distribution";
    			t5 = space();
    			div9 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			img = element("img");
    			t6 = space();
    			div4 = element("div");
    			canvas = element("canvas");
    			t7 = space();
    			div8 = element("div");
    			div7 = element("div");
    			div7.textContent = "Allocation of funds";
    			t9 = space();
    			p = element("p");
    			p.textContent = "Total token supply  - 152,358";
    			t11 = space();
    			ul = element("ul");
    			li0 = element("li");
    			span0 = element("span");
    			t12 = text("\n                        9% Founders and Team");
    			t13 = space();
    			li1 = element("li");
    			span1 = element("span");
    			t14 = text("\n                        13% Reserved Funding");
    			t15 = space();
    			li2 = element("li");
    			span2 = element("span");
    			t16 = text("\n                        2% Advisors");
    			t17 = space();
    			li3 = element("li");
    			span3 = element("span");
    			t18 = text("\n                        25% Distribute to Community");
    			t19 = space();
    			li4 = element("li");
    			span4 = element("span");
    			t20 = text("\n                        1% Bounty campaign");
    			add_location(h4, file$9, 5, 20, 289);
    			add_location(h2, file$9, 6, 20, 327);
    			attr_dev(div0, "class", "bg-title");
    			add_location(div0, file$9, 7, 20, 375);
    			attr_dev(div1, "class", "section-header section-header--animated section-header--medium-margin section-header--center");
    			add_location(div1, file$9, 4, 16, 162);
    			attr_dev(div2, "class", "col");
    			add_location(div2, file$9, 3, 12, 128);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$9, 2, 8, 98);
    			attr_dev(img, "class", "chart__bg");
    			if (!src_url_equal(img.src, img_src_value = "img/chart-bg.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$9, 16, 20, 672);
    			attr_dev(canvas, "id", "myChart");
    			attr_dev(canvas, "width", "400");
    			attr_dev(canvas, "height", "400");
    			add_location(canvas, file$9, 18, 24, 796);
    			attr_dev(div4, "class", "chart__wrap");
    			add_location(div4, file$9, 17, 20, 746);
    			attr_dev(div5, "class", "chart");
    			add_location(div5, file$9, 15, 16, 632);
    			attr_dev(div6, "class", "col-lg-6");
    			add_location(div6, file$9, 14, 12, 593);
    			attr_dev(div7, "class", "chart__title");
    			add_location(div7, file$9, 23, 16, 1022);
    			attr_dev(p, "class", "chart__text");
    			add_location(p, file$9, 26, 16, 1128);
    			set_style(span0, "width", "101px");
    			add_location(span0, file$9, 31, 24, 1315);
    			add_location(li0, file$9, 30, 20, 1286);
    			set_style(span1, "width", "153px");
    			add_location(span1, file$9, 35, 24, 1471);
    			add_location(li1, file$9, 34, 20, 1442);
    			set_style(span2, "width", "34px");
    			add_location(span2, file$9, 39, 24, 1627);
    			add_location(li2, file$9, 38, 20, 1598);
    			set_style(span3, "width", "289px");
    			add_location(span3, file$9, 43, 24, 1773);
    			add_location(li3, file$9, 42, 20, 1744);
    			set_style(span4, "width", "22px");
    			add_location(span4, file$9, 47, 24, 1936);
    			add_location(li4, file$9, 46, 20, 1907);
    			attr_dev(ul, "class", "chart__legend");
    			add_location(ul, file$9, 29, 16, 1239);
    			attr_dev(div8, "data-aos", "fade-left");
    			attr_dev(div8, "class", "col-lg-6 token-data__animated-content");
    			add_location(div8, file$9, 22, 12, 933);
    			attr_dev(div9, "class", "row chart__row align-items-center");
    			add_location(div9, file$9, 13, 8, 533);
    			attr_dev(div10, "class", "container");
    			add_location(div10, file$9, 1, 4, 66);
    			attr_dev(section, "class", "data token-data section section--no-pad-bot");
    			add_location(section, file$9, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div10);
    			append_dev(div10, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h4);
    			append_dev(div1, t1);
    			append_dev(div1, h2);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div10, t5);
    			append_dev(div10, div9);
    			append_dev(div9, div6);
    			append_dev(div6, div5);
    			append_dev(div5, img);
    			append_dev(div5, t6);
    			append_dev(div5, div4);
    			append_dev(div4, canvas);
    			append_dev(div9, t7);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div8, t9);
    			append_dev(div8, p);
    			append_dev(div8, t11);
    			append_dev(div8, ul);
    			append_dev(ul, li0);
    			append_dev(li0, span0);
    			append_dev(li0, t12);
    			append_dev(ul, t13);
    			append_dev(ul, li1);
    			append_dev(li1, span1);
    			append_dev(li1, t14);
    			append_dev(ul, t15);
    			append_dev(ul, li2);
    			append_dev(li2, span2);
    			append_dev(li2, t16);
    			append_dev(ul, t17);
    			append_dev(ul, li3);
    			append_dev(li3, span3);
    			append_dev(li3, t18);
    			append_dev(ul, t19);
    			append_dev(ul, li4);
    			append_dev(li4, span4);
    			append_dev(li4, t20);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Data', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Data> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Data extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Data",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/inc/faq.svelte generated by Svelte v3.44.0 */

    const file$8 = "src/inc/faq.svelte";

    function create_fragment$8(ctx) {
    	let section;
    	let div5;
    	let div2;
    	let div1;
    	let div0;
    	let h4;
    	let t1;
    	let h2;
    	let t3;
    	let div4;
    	let div3;
    	let ul;
    	let li0;
    	let a0;
    	let t5;
    	let p0;
    	let t7;
    	let li1;
    	let a1;
    	let t9;
    	let p1;
    	let t11;
    	let li2;
    	let a2;
    	let t13;
    	let p2;
    	let t15;
    	let li3;
    	let a3;
    	let t17;
    	let p3;
    	let t19;
    	let li4;
    	let a4;
    	let t21;
    	let p4;
    	let t23;
    	let li5;
    	let a5;
    	let t25;
    	let p5;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div5 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "FAQ";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Frequency Asked Questions";
    			t3 = space();
    			div4 = element("div");
    			div3 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Can American citizens take part in the crowdsale?";
    			t5 = space();
    			p0 = element("p");
    			p0.textContent = "JavaScript is also used in environments that aren’t web-based, such as PDF documents, site-specific browsers, and desktop widgets. Newer and faster JavaScript virtual machines (VMs) and platforms built upon them have also increased the popularity of JavaScript for server-side web applications. On the client side, JavaScript has been traditionally implemented as an interpreted language, but more recent browsers perform just-in-time compilation.";
    			t7 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Does the crowdsale comply with legal regulations?";
    			t9 = space();
    			p1 = element("p");
    			p1.textContent = "JavaScript is also used in environments that aren’t web-based, such as PDF documents, site-specific browsers, and desktop widgets. Newer and faster JavaScript virtual machines (VMs) and platforms built upon them have also increased the popularity of JavaScript for server-side web applications. On the client side, JavaScript has been traditionally implemented as an interpreted language, but more recent browsers perform just-in-time compilation.";
    			t11 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "Can I trade SCR at an exchange?";
    			t13 = space();
    			p2 = element("p");
    			p2.textContent = "JavaScript is also used in environments that aren’t web-based, such as PDF documents, site-specific browsers, and desktop widgets. Newer and faster JavaScript virtual machines (VMs) and platforms built upon them have also increased the popularity of JavaScript for server-side web applications. On the client side, JavaScript has been traditionally implemented as an interpreted language, but more recent browsers perform just-in-time compilation.";
    			t15 = space();
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "What is the difference between Coin tokens and Power tokens?";
    			t17 = space();
    			p3 = element("p");
    			p3.textContent = "JavaScript is also used in environments that aren’t web-based, such as PDF documents, site-specific browsers, and desktop widgets. Newer and faster JavaScript virtual machines (VMs) and platforms built upon them have also increased the popularity of JavaScript for server-side web applications. On the client side, JavaScript has been traditionally implemented as an interpreted language, but more recent browsers perform just-in-time compilation.";
    			t19 = space();
    			li4 = element("li");
    			a4 = element("a");
    			a4.textContent = "Why is Cryptonet economic model sustainable?";
    			t21 = space();
    			p4 = element("p");
    			p4.textContent = "JavaScript is also used in environments that aren’t web-based, such as PDF documents, site-specific browsers, and desktop widgets. Newer and faster JavaScript virtual machines (VMs) and platforms built upon them have also increased the popularity of JavaScript for server-side web applications. On the client side, JavaScript has been traditionally implemented as an interpreted language, but more recent browsers perform just-in-time compilation.";
    			t23 = space();
    			li5 = element("li");
    			a5 = element("a");
    			a5.textContent = "Can I mine SCR?";
    			t25 = space();
    			p5 = element("p");
    			p5.textContent = "JavaScript is also used in environments that aren’t web-based, such as PDF documents, site-specific browsers, and desktop widgets. Newer and faster JavaScript virtual machines (VMs) and platforms built upon them have also increased the popularity of JavaScript for server-side web applications. On the client side, JavaScript has been traditionally implemented as an interpreted language, but more recent browsers perform just-in-time compilation.";
    			add_location(h4, file$8, 5, 20, 241);
    			add_location(h2, file$8, 6, 20, 274);
    			attr_dev(div0, "class", "section-header section-header--center section-header--medium-margin");
    			add_location(div0, file$8, 4, 16, 139);
    			attr_dev(div1, "class", "col");
    			add_location(div1, file$8, 3, 12, 105);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$8, 2, 8, 75);
    			add_location(a0, file$8, 15, 28, 540);
    			add_location(p0, file$8, 16, 28, 625);
    			add_location(li0, file$8, 14, 24, 507);
    			add_location(a1, file$8, 21, 28, 1229);
    			add_location(p1, file$8, 22, 28, 1314);
    			add_location(li1, file$8, 20, 24, 1196);
    			add_location(a2, file$8, 27, 28, 1918);
    			add_location(p2, file$8, 28, 28, 1985);
    			add_location(li2, file$8, 26, 24, 1885);
    			add_location(a3, file$8, 33, 28, 2589);
    			add_location(p3, file$8, 34, 28, 2685);
    			add_location(li3, file$8, 32, 24, 2556);
    			add_location(a4, file$8, 39, 28, 3289);
    			add_location(p4, file$8, 40, 28, 3369);
    			add_location(li4, file$8, 38, 24, 3256);
    			add_location(a5, file$8, 45, 28, 3973);
    			add_location(p5, file$8, 46, 28, 4024);
    			add_location(li5, file$8, 44, 24, 3940);
    			attr_dev(ul, "class", "accordion");
    			add_location(ul, file$8, 13, 20, 460);
    			attr_dev(div3, "class", "col-lg-8 offset-lg-2");
    			add_location(div3, file$8, 11, 12, 404);
    			attr_dev(div4, "class", "row");
    			add_location(div4, file$8, 10, 8, 374);
    			attr_dev(div5, "class", "container");
    			add_location(div5, file$8, 1, 4, 43);
    			attr_dev(section, "class", "section faq");
    			attr_dev(section, "id", "faq");
    			add_location(section, file$8, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div5);
    			append_dev(div5, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(li0, t5);
    			append_dev(li0, p0);
    			append_dev(ul, t7);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(li1, t9);
    			append_dev(li1, p1);
    			append_dev(ul, t11);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			append_dev(li2, t13);
    			append_dev(li2, p2);
    			append_dev(ul, t15);
    			append_dev(ul, li3);
    			append_dev(li3, a3);
    			append_dev(li3, t17);
    			append_dev(li3, p3);
    			append_dev(ul, t19);
    			append_dev(ul, li4);
    			append_dev(li4, a4);
    			append_dev(li4, t21);
    			append_dev(li4, p4);
    			append_dev(ul, t23);
    			append_dev(ul, li5);
    			append_dev(li5, a5);
    			append_dev(li5, t25);
    			append_dev(li5, p5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Faq', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Faq> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Faq extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Faq",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/inc/advisors.svelte generated by Svelte v3.44.0 */

    const file$7 = "src/inc/advisors.svelte";

    function create_fragment$7(ctx) {
    	let section;
    	let div28;
    	let div2;
    	let div1;
    	let div0;
    	let h4;
    	let t1;
    	let h2;
    	let t3;
    	let div27;
    	let div8;
    	let div7;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let div3;
    	let img1;
    	let img1_src_value;
    	let t5;
    	let div6;
    	let div4;
    	let t7;
    	let div5;
    	let t9;
    	let p0;
    	let t11;
    	let div14;
    	let div13;
    	let a1;
    	let img2;
    	let img2_src_value;
    	let t12;
    	let div9;
    	let img3;
    	let img3_src_value;
    	let t13;
    	let div12;
    	let div10;
    	let t15;
    	let div11;
    	let t17;
    	let p1;
    	let t19;
    	let div20;
    	let div19;
    	let a2;
    	let img4;
    	let img4_src_value;
    	let t20;
    	let div15;
    	let img5;
    	let img5_src_value;
    	let t21;
    	let div18;
    	let div16;
    	let t23;
    	let div17;
    	let t25;
    	let p2;
    	let t27;
    	let div26;
    	let div25;
    	let a3;
    	let img6;
    	let img6_src_value;
    	let t28;
    	let div21;
    	let img7;
    	let img7_src_value;
    	let t29;
    	let div24;
    	let div22;
    	let t31;
    	let div23;
    	let t33;
    	let p3;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div28 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Family";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Advisors";
    			t3 = space();
    			div27 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			a0 = element("a");
    			img0 = element("img");
    			t4 = space();
    			div3 = element("div");
    			img1 = element("img");
    			t5 = space();
    			div6 = element("div");
    			div4 = element("div");
    			div4.textContent = "David Drake";
    			t7 = space();
    			div5 = element("div");
    			div5.textContent = "CEO Capital Limited";
    			t9 = space();
    			p0 = element("p");
    			p0.textContent = "JavaScript virtual machines (VMs) and platforms built upon them have also increased the popularity of JavaScript for server-side web";
    			t11 = space();
    			div14 = element("div");
    			div13 = element("div");
    			a1 = element("a");
    			img2 = element("img");
    			t12 = space();
    			div9 = element("div");
    			img3 = element("img");
    			t13 = space();
    			div12 = element("div");
    			div10 = element("div");
    			div10.textContent = "Ann Balock";
    			t15 = space();
    			div11 = element("div");
    			div11.textContent = "Cryptonet Speaker";
    			t17 = space();
    			p1 = element("p");
    			p1.textContent = "JavaScript virtual machines (VMs) and platforms built upon them have also increased the popularity of JavaScript for server-side web";
    			t19 = space();
    			div20 = element("div");
    			div19 = element("div");
    			a2 = element("a");
    			img4 = element("img");
    			t20 = space();
    			div15 = element("div");
    			img5 = element("img");
    			t21 = space();
    			div18 = element("div");
    			div16 = element("div");
    			div16.textContent = "Vladimir Nikitin";
    			t23 = space();
    			div17 = element("div");
    			div17.textContent = "Cryptonet Team Lead";
    			t25 = space();
    			p2 = element("p");
    			p2.textContent = "Giant wels roach spotted danio Black swallower cowfish bigscale flagblenny central mudminnow. Lighthousefish combtooth blenny";
    			t27 = space();
    			div26 = element("div");
    			div25 = element("div");
    			a3 = element("a");
    			img6 = element("img");
    			t28 = space();
    			div21 = element("div");
    			img7 = element("img");
    			t29 = space();
    			div24 = element("div");
    			div22 = element("div");
    			div22.textContent = "Sam Peters";
    			t31 = space();
    			div23 = element("div");
    			div23.textContent = "Team Lead Advisor";
    			t33 = space();
    			p3 = element("p");
    			p3.textContent = "Lampfish combfish, roundhead lemon sole armoured catfish saw shark northern stargazer smooth dogfish cod icefish scythe butterfish";
    			add_location(h4, file$7, 5, 20, 251);
    			add_location(h2, file$7, 6, 20, 287);
    			attr_dev(div0, "class", "section-header section-header--animated section-header--center section-header--big-margin");
    			add_location(div0, file$7, 4, 16, 127);
    			attr_dev(div1, "class", "col");
    			add_location(div1, file$7, 3, 12, 93);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$7, 2, 8, 63);
    			if (!src_url_equal(img0.src, img0_src_value = "img/advisor-avatar-1.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$7, 14, 24, 561);
    			if (!src_url_equal(img1.src, img1_src_value = "img/facebook.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$7, 16, 28, 683);
    			attr_dev(div3, "class", "advisor__sn");
    			add_location(div3, file$7, 15, 24, 629);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "advisor__img");
    			add_location(a0, file$7, 13, 20, 503);
    			attr_dev(div4, "class", "advisor__title");
    			add_location(div4, file$7, 20, 24, 850);
    			attr_dev(div5, "class", "advisor__post");
    			add_location(div5, file$7, 23, 24, 974);
    			attr_dev(p0, "class", "advisor__text");
    			add_location(p0, file$7, 26, 24, 1105);
    			attr_dev(div6, "class", "advisor__content");
    			add_location(div6, file$7, 19, 20, 795);
    			attr_dev(div7, "class", "advisor");
    			add_location(div7, file$7, 12, 16, 461);
    			attr_dev(div8, "data-aos", "fade-right");
    			attr_dev(div8, "class", "col-md-6");
    			add_location(div8, file$7, 11, 12, 400);
    			if (!src_url_equal(img2.src, img2_src_value = "img/advisor-avatar-2.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$7, 36, 24, 1584);
    			if (!src_url_equal(img3.src, img3_src_value = "img/linkedin.svg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$7, 38, 28, 1706);
    			attr_dev(div9, "class", "advisor__sn");
    			add_location(div9, file$7, 37, 24, 1652);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "advisor__img");
    			add_location(a1, file$7, 35, 20, 1526);
    			attr_dev(div10, "class", "advisor__title");
    			add_location(div10, file$7, 42, 24, 1873);
    			attr_dev(div11, "class", "advisor__post");
    			add_location(div11, file$7, 45, 24, 1996);
    			attr_dev(p1, "class", "advisor__text");
    			add_location(p1, file$7, 48, 24, 2125);
    			attr_dev(div12, "class", "advisor__content");
    			add_location(div12, file$7, 41, 20, 1818);
    			attr_dev(div13, "class", "advisor");
    			add_location(div13, file$7, 34, 16, 1484);
    			attr_dev(div14, "data-aos", "fade-left");
    			attr_dev(div14, "data-aos-delay", "200");
    			attr_dev(div14, "class", "col-md-6");
    			add_location(div14, file$7, 33, 12, 1403);
    			if (!src_url_equal(img4.src, img4_src_value = "img/advisor-avatar-3.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$7, 58, 24, 2584);
    			if (!src_url_equal(img5.src, img5_src_value = "img/google-plus.svg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$7, 60, 28, 2706);
    			attr_dev(div15, "class", "advisor__sn");
    			add_location(div15, file$7, 59, 24, 2652);
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "class", "advisor__img");
    			add_location(a2, file$7, 57, 20, 2526);
    			attr_dev(div16, "class", "advisor__title");
    			add_location(div16, file$7, 64, 24, 2876);
    			attr_dev(div17, "class", "advisor__post");
    			add_location(div17, file$7, 67, 24, 3005);
    			attr_dev(p2, "class", "advisor__text");
    			add_location(p2, file$7, 70, 24, 3136);
    			attr_dev(div18, "class", "advisor__content");
    			add_location(div18, file$7, 63, 20, 2821);
    			attr_dev(div19, "class", "advisor");
    			add_location(div19, file$7, 56, 16, 2484);
    			attr_dev(div20, "data-aos", "fade-right");
    			attr_dev(div20, "class", "col-md-6");
    			add_location(div20, file$7, 55, 12, 2423);
    			if (!src_url_equal(img6.src, img6_src_value = "img/advisor-avatar-4.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "");
    			add_location(img6, file$7, 80, 24, 3608);
    			if (!src_url_equal(img7.src, img7_src_value = "img/facebook.svg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "alt", "");
    			add_location(img7, file$7, 82, 28, 3730);
    			attr_dev(div21, "class", "advisor__sn");
    			add_location(div21, file$7, 81, 24, 3676);
    			attr_dev(a3, "href", "#");
    			attr_dev(a3, "class", "advisor__img");
    			add_location(a3, file$7, 79, 20, 3550);
    			attr_dev(div22, "class", "advisor__title");
    			add_location(div22, file$7, 86, 24, 3897);
    			attr_dev(div23, "class", "advisor__post");
    			add_location(div23, file$7, 89, 24, 4020);
    			attr_dev(p3, "class", "advisor__text");
    			add_location(p3, file$7, 92, 24, 4149);
    			attr_dev(div24, "class", "advisor__content");
    			add_location(div24, file$7, 85, 20, 3842);
    			attr_dev(div25, "class", "advisor");
    			add_location(div25, file$7, 78, 16, 3508);
    			attr_dev(div26, "data-aos", "fade-left");
    			attr_dev(div26, "data-aos-delay", "200");
    			attr_dev(div26, "class", "col-md-6");
    			add_location(div26, file$7, 77, 12, 3427);
    			attr_dev(div27, "class", "row");
    			add_location(div27, file$7, 10, 8, 370);
    			attr_dev(div28, "class", "container");
    			add_location(div28, file$7, 1, 4, 31);
    			attr_dev(section, "class", "advisors");
    			add_location(section, file$7, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div28);
    			append_dev(div28, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(div28, t3);
    			append_dev(div28, div27);
    			append_dev(div27, div8);
    			append_dev(div8, div7);
    			append_dev(div7, a0);
    			append_dev(a0, img0);
    			append_dev(a0, t4);
    			append_dev(a0, div3);
    			append_dev(div3, img1);
    			append_dev(div7, t5);
    			append_dev(div7, div6);
    			append_dev(div6, div4);
    			append_dev(div6, t7);
    			append_dev(div6, div5);
    			append_dev(div6, t9);
    			append_dev(div6, p0);
    			append_dev(div27, t11);
    			append_dev(div27, div14);
    			append_dev(div14, div13);
    			append_dev(div13, a1);
    			append_dev(a1, img2);
    			append_dev(a1, t12);
    			append_dev(a1, div9);
    			append_dev(div9, img3);
    			append_dev(div13, t13);
    			append_dev(div13, div12);
    			append_dev(div12, div10);
    			append_dev(div12, t15);
    			append_dev(div12, div11);
    			append_dev(div12, t17);
    			append_dev(div12, p1);
    			append_dev(div27, t19);
    			append_dev(div27, div20);
    			append_dev(div20, div19);
    			append_dev(div19, a2);
    			append_dev(a2, img4);
    			append_dev(a2, t20);
    			append_dev(a2, div15);
    			append_dev(div15, img5);
    			append_dev(div19, t21);
    			append_dev(div19, div18);
    			append_dev(div18, div16);
    			append_dev(div18, t23);
    			append_dev(div18, div17);
    			append_dev(div18, t25);
    			append_dev(div18, p2);
    			append_dev(div27, t27);
    			append_dev(div27, div26);
    			append_dev(div26, div25);
    			append_dev(div25, a3);
    			append_dev(a3, img6);
    			append_dev(a3, t28);
    			append_dev(a3, div21);
    			append_dev(div21, img7);
    			append_dev(div25, t29);
    			append_dev(div25, div24);
    			append_dev(div24, div22);
    			append_dev(div24, t31);
    			append_dev(div24, div23);
    			append_dev(div24, t33);
    			append_dev(div24, p3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Advisors', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Advisors> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Advisors extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Advisors",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/inc/team.svelte generated by Svelte v3.44.0 */

    const file$6 = "src/inc/team.svelte";

    function create_fragment$6(ctx) {
    	let section;
    	let div64;
    	let div2;
    	let div1;
    	let div0;
    	let h4;
    	let t1;
    	let h2;
    	let t3;
    	let div63;
    	let div7;
    	let div6;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let div5;
    	let div3;
    	let t6;
    	let div4;
    	let t8;
    	let ul0;
    	let li0;
    	let a0;
    	let img1;
    	let img1_src_value;
    	let t9;
    	let li1;
    	let a1;
    	let img2;
    	let img2_src_value;
    	let t10;
    	let li2;
    	let a2;
    	let img3;
    	let img3_src_value;
    	let t11;
    	let div12;
    	let div11;
    	let img4;
    	let img4_src_value;
    	let t12;
    	let div10;
    	let div8;
    	let t14;
    	let div9;
    	let t16;
    	let ul1;
    	let li3;
    	let a3;
    	let img5;
    	let img5_src_value;
    	let t17;
    	let li4;
    	let a4;
    	let img6;
    	let img6_src_value;
    	let t18;
    	let li5;
    	let a5;
    	let img7;
    	let img7_src_value;
    	let t19;
    	let div17;
    	let div16;
    	let img8;
    	let img8_src_value;
    	let t20;
    	let div15;
    	let div13;
    	let t22;
    	let div14;
    	let t24;
    	let ul2;
    	let li6;
    	let a6;
    	let img9;
    	let img9_src_value;
    	let t25;
    	let li7;
    	let a7;
    	let img10;
    	let img10_src_value;
    	let t26;
    	let li8;
    	let a8;
    	let img11;
    	let img11_src_value;
    	let t27;
    	let div22;
    	let div21;
    	let img12;
    	let img12_src_value;
    	let t28;
    	let div20;
    	let div18;
    	let t30;
    	let div19;
    	let t32;
    	let ul3;
    	let li9;
    	let a9;
    	let img13;
    	let img13_src_value;
    	let t33;
    	let li10;
    	let a10;
    	let img14;
    	let img14_src_value;
    	let t34;
    	let li11;
    	let a11;
    	let img15;
    	let img15_src_value;
    	let t35;
    	let div27;
    	let div26;
    	let img16;
    	let img16_src_value;
    	let t36;
    	let div25;
    	let div23;
    	let t38;
    	let div24;
    	let t40;
    	let ul4;
    	let li12;
    	let a12;
    	let img17;
    	let img17_src_value;
    	let t41;
    	let li13;
    	let a13;
    	let img18;
    	let img18_src_value;
    	let t42;
    	let li14;
    	let a14;
    	let img19;
    	let img19_src_value;
    	let t43;
    	let div32;
    	let div31;
    	let img20;
    	let img20_src_value;
    	let t44;
    	let div30;
    	let div28;
    	let t46;
    	let div29;
    	let t48;
    	let ul5;
    	let li15;
    	let a15;
    	let img21;
    	let img21_src_value;
    	let t49;
    	let li16;
    	let a16;
    	let img22;
    	let img22_src_value;
    	let t50;
    	let li17;
    	let a17;
    	let img23;
    	let img23_src_value;
    	let t51;
    	let div37;
    	let div36;
    	let img24;
    	let img24_src_value;
    	let t52;
    	let div35;
    	let div33;
    	let t54;
    	let div34;
    	let t56;
    	let ul6;
    	let li18;
    	let a18;
    	let img25;
    	let img25_src_value;
    	let t57;
    	let li19;
    	let a19;
    	let img26;
    	let img26_src_value;
    	let t58;
    	let li20;
    	let a20;
    	let img27;
    	let img27_src_value;
    	let t59;
    	let div42;
    	let div41;
    	let img28;
    	let img28_src_value;
    	let t60;
    	let div40;
    	let div38;
    	let t62;
    	let div39;
    	let t64;
    	let ul7;
    	let li21;
    	let a21;
    	let img29;
    	let img29_src_value;
    	let t65;
    	let li22;
    	let a22;
    	let img30;
    	let img30_src_value;
    	let t66;
    	let li23;
    	let a23;
    	let img31;
    	let img31_src_value;
    	let t67;
    	let div47;
    	let div46;
    	let img32;
    	let img32_src_value;
    	let t68;
    	let div45;
    	let div43;
    	let t70;
    	let div44;
    	let t72;
    	let ul8;
    	let li24;
    	let a24;
    	let img33;
    	let img33_src_value;
    	let t73;
    	let li25;
    	let a25;
    	let img34;
    	let img34_src_value;
    	let t74;
    	let li26;
    	let a26;
    	let img35;
    	let img35_src_value;
    	let t75;
    	let div52;
    	let div51;
    	let img36;
    	let img36_src_value;
    	let t76;
    	let div50;
    	let div48;
    	let t78;
    	let div49;
    	let t80;
    	let ul9;
    	let li27;
    	let a27;
    	let img37;
    	let img37_src_value;
    	let t81;
    	let li28;
    	let a28;
    	let img38;
    	let img38_src_value;
    	let t82;
    	let li29;
    	let a29;
    	let img39;
    	let img39_src_value;
    	let t83;
    	let div57;
    	let div56;
    	let img40;
    	let img40_src_value;
    	let t84;
    	let div55;
    	let div53;
    	let t86;
    	let div54;
    	let t88;
    	let ul10;
    	let li30;
    	let a30;
    	let img41;
    	let img41_src_value;
    	let t89;
    	let li31;
    	let a31;
    	let img42;
    	let img42_src_value;
    	let t90;
    	let li32;
    	let a32;
    	let img43;
    	let img43_src_value;
    	let t91;
    	let div62;
    	let div61;
    	let img44;
    	let img44_src_value;
    	let t92;
    	let div60;
    	let div58;
    	let t94;
    	let div59;
    	let t96;
    	let ul11;
    	let li33;
    	let a33;
    	let img45;
    	let img45_src_value;
    	let t97;
    	let li34;
    	let a34;
    	let img46;
    	let img46_src_value;
    	let t98;
    	let li35;
    	let a35;
    	let img47;
    	let img47_src_value;
    	let t99;
    	let img48;
    	let img48_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div64 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Our brain";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Awesome Team";
    			t3 = space();
    			div63 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			img0 = element("img");
    			t4 = space();
    			div5 = element("div");
    			div3 = element("div");
    			div3.textContent = "David Drake";
    			t6 = space();
    			div4 = element("div");
    			div4.textContent = "UI Designer";
    			t8 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			img1 = element("img");
    			t9 = space();
    			li1 = element("li");
    			a1 = element("a");
    			img2 = element("img");
    			t10 = space();
    			li2 = element("li");
    			a2 = element("a");
    			img3 = element("img");
    			t11 = space();
    			div12 = element("div");
    			div11 = element("div");
    			img4 = element("img");
    			t12 = space();
    			div10 = element("div");
    			div8 = element("div");
    			div8.textContent = "Allan Bellor";
    			t14 = space();
    			div9 = element("div");
    			div9.textContent = "Analitics";
    			t16 = space();
    			ul1 = element("ul");
    			li3 = element("li");
    			a3 = element("a");
    			img5 = element("img");
    			t17 = space();
    			li4 = element("li");
    			a4 = element("a");
    			img6 = element("img");
    			t18 = space();
    			li5 = element("li");
    			a5 = element("a");
    			img7 = element("img");
    			t19 = space();
    			div17 = element("div");
    			div16 = element("div");
    			img8 = element("img");
    			t20 = space();
    			div15 = element("div");
    			div13 = element("div");
    			div13.textContent = "Joe Doe";
    			t22 = space();
    			div14 = element("div");
    			div14.textContent = "Tech Operation";
    			t24 = space();
    			ul2 = element("ul");
    			li6 = element("li");
    			a6 = element("a");
    			img9 = element("img");
    			t25 = space();
    			li7 = element("li");
    			a7 = element("a");
    			img10 = element("img");
    			t26 = space();
    			li8 = element("li");
    			a8 = element("a");
    			img11 = element("img");
    			t27 = space();
    			div22 = element("div");
    			div21 = element("div");
    			img12 = element("img");
    			t28 = space();
    			div20 = element("div");
    			div18 = element("div");
    			div18.textContent = "Sam Tolder";
    			t30 = space();
    			div19 = element("div");
    			div19.textContent = "CEO";
    			t32 = space();
    			ul3 = element("ul");
    			li9 = element("li");
    			a9 = element("a");
    			img13 = element("img");
    			t33 = space();
    			li10 = element("li");
    			a10 = element("a");
    			img14 = element("img");
    			t34 = space();
    			li11 = element("li");
    			a11 = element("a");
    			img15 = element("img");
    			t35 = space();
    			div27 = element("div");
    			div26 = element("div");
    			img16 = element("img");
    			t36 = space();
    			div25 = element("div");
    			div23 = element("div");
    			div23.textContent = "Henry Polar";
    			t38 = space();
    			div24 = element("div");
    			div24.textContent = "SEO Specialist";
    			t40 = space();
    			ul4 = element("ul");
    			li12 = element("li");
    			a12 = element("a");
    			img17 = element("img");
    			t41 = space();
    			li13 = element("li");
    			a13 = element("a");
    			img18 = element("img");
    			t42 = space();
    			li14 = element("li");
    			a14 = element("a");
    			img19 = element("img");
    			t43 = space();
    			div32 = element("div");
    			div31 = element("div");
    			img20 = element("img");
    			t44 = space();
    			div30 = element("div");
    			div28 = element("div");
    			div28.textContent = "Sandra Pen";
    			t46 = space();
    			div29 = element("div");
    			div29.textContent = "Humar Resources";
    			t48 = space();
    			ul5 = element("ul");
    			li15 = element("li");
    			a15 = element("a");
    			img21 = element("img");
    			t49 = space();
    			li16 = element("li");
    			a16 = element("a");
    			img22 = element("img");
    			t50 = space();
    			li17 = element("li");
    			a17 = element("a");
    			img23 = element("img");
    			t51 = space();
    			div37 = element("div");
    			div36 = element("div");
    			img24 = element("img");
    			t52 = space();
    			div35 = element("div");
    			div33 = element("div");
    			div33.textContent = "Linda Gampton";
    			t54 = space();
    			div34 = element("div");
    			div34.textContent = "UX Team Lead";
    			t56 = space();
    			ul6 = element("ul");
    			li18 = element("li");
    			a18 = element("a");
    			img25 = element("img");
    			t57 = space();
    			li19 = element("li");
    			a19 = element("a");
    			img26 = element("img");
    			t58 = space();
    			li20 = element("li");
    			a20 = element("a");
    			img27 = element("img");
    			t59 = space();
    			div42 = element("div");
    			div41 = element("div");
    			img28 = element("img");
    			t60 = space();
    			div40 = element("div");
    			div38 = element("div");
    			div38.textContent = "John Smith";
    			t62 = space();
    			div39 = element("div");
    			div39.textContent = "General Director";
    			t64 = space();
    			ul7 = element("ul");
    			li21 = element("li");
    			a21 = element("a");
    			img29 = element("img");
    			t65 = space();
    			li22 = element("li");
    			a22 = element("a");
    			img30 = element("img");
    			t66 = space();
    			li23 = element("li");
    			a23 = element("a");
    			img31 = element("img");
    			t67 = space();
    			div47 = element("div");
    			div46 = element("div");
    			img32 = element("img");
    			t68 = space();
    			div45 = element("div");
    			div43 = element("div");
    			div43.textContent = "Sam Oldrich";
    			t70 = space();
    			div44 = element("div");
    			div44.textContent = "Manager";
    			t72 = space();
    			ul8 = element("ul");
    			li24 = element("li");
    			a24 = element("a");
    			img33 = element("img");
    			t73 = space();
    			li25 = element("li");
    			a25 = element("a");
    			img34 = element("img");
    			t74 = space();
    			li26 = element("li");
    			a26 = element("a");
    			img35 = element("img");
    			t75 = space();
    			div52 = element("div");
    			div51 = element("div");
    			img36 = element("img");
    			t76 = space();
    			div50 = element("div");
    			div48 = element("div");
    			div48.textContent = "Denis Portlen";
    			t78 = space();
    			div49 = element("div");
    			div49.textContent = "Programmer";
    			t80 = space();
    			ul9 = element("ul");
    			li27 = element("li");
    			a27 = element("a");
    			img37 = element("img");
    			t81 = space();
    			li28 = element("li");
    			a28 = element("a");
    			img38 = element("img");
    			t82 = space();
    			li29 = element("li");
    			a29 = element("a");
    			img39 = element("img");
    			t83 = space();
    			div57 = element("div");
    			div56 = element("div");
    			img40 = element("img");
    			t84 = space();
    			div55 = element("div");
    			div53 = element("div");
    			div53.textContent = "Den Miller";
    			t86 = space();
    			div54 = element("div");
    			div54.textContent = "Economist";
    			t88 = space();
    			ul10 = element("ul");
    			li30 = element("li");
    			a30 = element("a");
    			img41 = element("img");
    			t89 = space();
    			li31 = element("li");
    			a31 = element("a");
    			img42 = element("img");
    			t90 = space();
    			li32 = element("li");
    			a32 = element("a");
    			img43 = element("img");
    			t91 = space();
    			div62 = element("div");
    			div61 = element("div");
    			img44 = element("img");
    			t92 = space();
    			div60 = element("div");
    			div58 = element("div");
    			div58.textContent = "Brawn Lee";
    			t94 = space();
    			div59 = element("div");
    			div59.textContent = "Journalist";
    			t96 = space();
    			ul11 = element("ul");
    			li33 = element("li");
    			a33 = element("a");
    			img45 = element("img");
    			t97 = space();
    			li34 = element("li");
    			a34 = element("a");
    			img46 = element("img");
    			t98 = space();
    			li35 = element("li");
    			a35 = element("a");
    			img47 = element("img");
    			t99 = space();
    			img48 = element("img");
    			add_location(h4, file$6, 5, 20, 261);
    			add_location(h2, file$6, 6, 20, 300);
    			attr_dev(div0, "class", "section-header section-header--tire section-header--medium-margin");
    			add_location(div0, file$6, 4, 16, 161);
    			attr_dev(div1, "class", "col");
    			add_location(div1, file$6, 3, 12, 127);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$6, 2, 8, 97);
    			attr_dev(img0, "class", "team-member__avatar");
    			if (!src_url_equal(img0.src, img0_src_value = "img/ava1.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$6, 13, 20, 539);
    			attr_dev(div3, "class", "team-member__name");
    			add_location(div3, file$6, 15, 24, 678);
    			attr_dev(div4, "class", "team-member__post");
    			add_location(div4, file$6, 16, 24, 751);
    			if (!src_url_equal(img1.src, img1_src_value = "img/facebook.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$6, 18, 44, 901);
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$6, 18, 32, 889);
    			add_location(li0, file$6, 18, 28, 885);
    			if (!src_url_equal(img2.src, img2_src_value = "img/linkedin.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$6, 19, 44, 990);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$6, 19, 32, 978);
    			add_location(li1, file$6, 19, 28, 974);
    			if (!src_url_equal(img3.src, img3_src_value = "img/google-plus.svg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$6, 20, 44, 1079);
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$6, 20, 32, 1067);
    			add_location(li2, file$6, 20, 28, 1063);
    			attr_dev(ul0, "class", "team-member__social");
    			add_location(ul0, file$6, 17, 24, 824);
    			attr_dev(div5, "class", "team-member__content");
    			add_location(div5, file$6, 14, 20, 619);
    			attr_dev(div6, "class", "team-member");
    			add_location(div6, file$6, 12, 16, 493);
    			attr_dev(div7, "data-aos", "fade-right");
    			attr_dev(div7, "class", "col-lg-4 col-xl-3 col-6");
    			add_location(div7, file$6, 11, 12, 417);
    			attr_dev(img4, "class", "team-member__avatar");
    			if (!src_url_equal(img4.src, img4_src_value = "img/ava2.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$6, 27, 20, 1381);
    			attr_dev(div8, "class", "team-member__name");
    			add_location(div8, file$6, 29, 24, 1520);
    			attr_dev(div9, "class", "team-member__post");
    			add_location(div9, file$6, 30, 24, 1594);
    			if (!src_url_equal(img5.src, img5_src_value = "img/facebook.svg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$6, 32, 44, 1742);
    			attr_dev(a3, "href", "#");
    			add_location(a3, file$6, 32, 32, 1730);
    			add_location(li3, file$6, 32, 28, 1726);
    			if (!src_url_equal(img6.src, img6_src_value = "img/linkedin.svg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "");
    			add_location(img6, file$6, 33, 44, 1831);
    			attr_dev(a4, "href", "#");
    			add_location(a4, file$6, 33, 32, 1819);
    			add_location(li4, file$6, 33, 28, 1815);
    			if (!src_url_equal(img7.src, img7_src_value = "img/google-plus.svg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "alt", "");
    			add_location(img7, file$6, 34, 44, 1920);
    			attr_dev(a5, "href", "#");
    			add_location(a5, file$6, 34, 32, 1908);
    			add_location(li5, file$6, 34, 28, 1904);
    			attr_dev(ul1, "class", "team-member__social");
    			add_location(ul1, file$6, 31, 24, 1665);
    			attr_dev(div10, "class", "team-member__content");
    			add_location(div10, file$6, 28, 20, 1461);
    			attr_dev(div11, "class", "team-member");
    			add_location(div11, file$6, 26, 16, 1335);
    			attr_dev(div12, "data-aos", "fade-right");
    			attr_dev(div12, "data-aos-delay", "100");
    			attr_dev(div12, "class", "col-lg-4 col-xl-3 col-6");
    			add_location(div12, file$6, 25, 12, 1238);
    			attr_dev(img8, "class", "team-member__avatar");
    			if (!src_url_equal(img8.src, img8_src_value = "img/ava3.png")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "");
    			add_location(img8, file$6, 41, 20, 2222);
    			attr_dev(div13, "class", "team-member__name");
    			add_location(div13, file$6, 43, 24, 2361);
    			attr_dev(div14, "class", "team-member__post");
    			add_location(div14, file$6, 44, 24, 2430);
    			if (!src_url_equal(img9.src, img9_src_value = "img/facebook.svg")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "alt", "");
    			add_location(img9, file$6, 46, 44, 2583);
    			attr_dev(a6, "href", "#");
    			add_location(a6, file$6, 46, 32, 2571);
    			add_location(li6, file$6, 46, 28, 2567);
    			if (!src_url_equal(img10.src, img10_src_value = "img/linkedin.svg")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "alt", "");
    			add_location(img10, file$6, 47, 44, 2672);
    			attr_dev(a7, "href", "#");
    			add_location(a7, file$6, 47, 32, 2660);
    			add_location(li7, file$6, 47, 28, 2656);
    			if (!src_url_equal(img11.src, img11_src_value = "img/google-plus.svg")) attr_dev(img11, "src", img11_src_value);
    			attr_dev(img11, "alt", "");
    			add_location(img11, file$6, 48, 44, 2761);
    			attr_dev(a8, "href", "#");
    			add_location(a8, file$6, 48, 32, 2749);
    			add_location(li8, file$6, 48, 28, 2745);
    			attr_dev(ul2, "class", "team-member__social");
    			add_location(ul2, file$6, 45, 24, 2506);
    			attr_dev(div15, "class", "team-member__content");
    			add_location(div15, file$6, 42, 20, 2302);
    			attr_dev(div16, "class", "team-member");
    			add_location(div16, file$6, 40, 16, 2176);
    			attr_dev(div17, "data-aos", "fade-right");
    			attr_dev(div17, "data-aos-delay", "200");
    			attr_dev(div17, "class", "col-lg-4 col-xl-3 col-6");
    			add_location(div17, file$6, 39, 12, 2079);
    			attr_dev(img12, "class", "team-member__avatar");
    			if (!src_url_equal(img12.src, img12_src_value = "img/ava4.png")) attr_dev(img12, "src", img12_src_value);
    			attr_dev(img12, "alt", "");
    			add_location(img12, file$6, 55, 20, 3063);
    			attr_dev(div18, "class", "team-member__name");
    			add_location(div18, file$6, 57, 24, 3202);
    			attr_dev(div19, "class", "team-member__post");
    			add_location(div19, file$6, 58, 24, 3274);
    			if (!src_url_equal(img13.src, img13_src_value = "img/facebook.svg")) attr_dev(img13, "src", img13_src_value);
    			attr_dev(img13, "alt", "");
    			add_location(img13, file$6, 60, 44, 3416);
    			attr_dev(a9, "href", "#");
    			add_location(a9, file$6, 60, 32, 3404);
    			add_location(li9, file$6, 60, 28, 3400);
    			if (!src_url_equal(img14.src, img14_src_value = "img/linkedin.svg")) attr_dev(img14, "src", img14_src_value);
    			attr_dev(img14, "alt", "");
    			add_location(img14, file$6, 61, 44, 3505);
    			attr_dev(a10, "href", "#");
    			add_location(a10, file$6, 61, 32, 3493);
    			add_location(li10, file$6, 61, 28, 3489);
    			if (!src_url_equal(img15.src, img15_src_value = "img/google-plus.svg")) attr_dev(img15, "src", img15_src_value);
    			attr_dev(img15, "alt", "");
    			add_location(img15, file$6, 62, 44, 3594);
    			attr_dev(a11, "href", "#");
    			add_location(a11, file$6, 62, 32, 3582);
    			add_location(li11, file$6, 62, 28, 3578);
    			attr_dev(ul3, "class", "team-member__social");
    			add_location(ul3, file$6, 59, 24, 3339);
    			attr_dev(div20, "class", "team-member__content");
    			add_location(div20, file$6, 56, 20, 3143);
    			attr_dev(div21, "class", "team-member");
    			add_location(div21, file$6, 54, 16, 3017);
    			attr_dev(div22, "data-aos", "fade-right");
    			attr_dev(div22, "data-aos-delay", "300");
    			attr_dev(div22, "class", "col-lg-4 col-xl-3 col-6");
    			add_location(div22, file$6, 53, 12, 2920);
    			attr_dev(img16, "class", "team-member__avatar");
    			if (!src_url_equal(img16.src, img16_src_value = "img/ava5.png")) attr_dev(img16, "src", img16_src_value);
    			attr_dev(img16, "alt", "");
    			add_location(img16, file$6, 69, 20, 3875);
    			attr_dev(div23, "class", "team-member__name");
    			add_location(div23, file$6, 71, 24, 4014);
    			attr_dev(div24, "class", "team-member__post");
    			add_location(div24, file$6, 72, 24, 4087);
    			if (!src_url_equal(img17.src, img17_src_value = "img/facebook.svg")) attr_dev(img17, "src", img17_src_value);
    			attr_dev(img17, "alt", "");
    			add_location(img17, file$6, 74, 44, 4240);
    			attr_dev(a12, "href", "#");
    			add_location(a12, file$6, 74, 32, 4228);
    			add_location(li12, file$6, 74, 28, 4224);
    			if (!src_url_equal(img18.src, img18_src_value = "img/linkedin.svg")) attr_dev(img18, "src", img18_src_value);
    			attr_dev(img18, "alt", "");
    			add_location(img18, file$6, 75, 44, 4329);
    			attr_dev(a13, "href", "#");
    			add_location(a13, file$6, 75, 32, 4317);
    			add_location(li13, file$6, 75, 28, 4313);
    			if (!src_url_equal(img19.src, img19_src_value = "img/google-plus.svg")) attr_dev(img19, "src", img19_src_value);
    			attr_dev(img19, "alt", "");
    			add_location(img19, file$6, 76, 44, 4418);
    			attr_dev(a14, "href", "#");
    			add_location(a14, file$6, 76, 32, 4406);
    			add_location(li14, file$6, 76, 28, 4402);
    			attr_dev(ul4, "class", "team-member__social");
    			add_location(ul4, file$6, 73, 24, 4163);
    			attr_dev(div25, "class", "team-member__content");
    			add_location(div25, file$6, 70, 20, 3955);
    			attr_dev(div26, "class", "team-member");
    			add_location(div26, file$6, 68, 16, 3829);
    			attr_dev(div27, "data-aos", "fade-right");
    			attr_dev(div27, "class", "col-lg-4 col-xl-3 col-6");
    			add_location(div27, file$6, 67, 12, 3753);
    			attr_dev(img20, "class", "team-member__avatar");
    			if (!src_url_equal(img20.src, img20_src_value = "img/ava6.png")) attr_dev(img20, "src", img20_src_value);
    			attr_dev(img20, "alt", "");
    			add_location(img20, file$6, 83, 20, 4720);
    			attr_dev(div28, "class", "team-member__name");
    			add_location(div28, file$6, 85, 24, 4859);
    			attr_dev(div29, "class", "team-member__post");
    			add_location(div29, file$6, 86, 24, 4931);
    			if (!src_url_equal(img21.src, img21_src_value = "img/facebook.svg")) attr_dev(img21, "src", img21_src_value);
    			attr_dev(img21, "alt", "");
    			add_location(img21, file$6, 88, 44, 5085);
    			attr_dev(a15, "href", "#");
    			add_location(a15, file$6, 88, 32, 5073);
    			add_location(li15, file$6, 88, 28, 5069);
    			if (!src_url_equal(img22.src, img22_src_value = "img/linkedin.svg")) attr_dev(img22, "src", img22_src_value);
    			attr_dev(img22, "alt", "");
    			add_location(img22, file$6, 89, 44, 5174);
    			attr_dev(a16, "href", "#");
    			add_location(a16, file$6, 89, 32, 5162);
    			add_location(li16, file$6, 89, 28, 5158);
    			if (!src_url_equal(img23.src, img23_src_value = "img/google-plus.svg")) attr_dev(img23, "src", img23_src_value);
    			attr_dev(img23, "alt", "");
    			add_location(img23, file$6, 90, 44, 5263);
    			attr_dev(a17, "href", "#");
    			add_location(a17, file$6, 90, 32, 5251);
    			add_location(li17, file$6, 90, 28, 5247);
    			attr_dev(ul5, "class", "team-member__social");
    			add_location(ul5, file$6, 87, 24, 5008);
    			attr_dev(div30, "class", "team-member__content");
    			add_location(div30, file$6, 84, 20, 4800);
    			attr_dev(div31, "class", "team-member");
    			add_location(div31, file$6, 82, 16, 4674);
    			attr_dev(div32, "data-aos", "fade-right");
    			attr_dev(div32, "data-aos-delay", "100");
    			attr_dev(div32, "class", "col-lg-4 col-xl-3 col-6");
    			add_location(div32, file$6, 81, 12, 4577);
    			attr_dev(img24, "class", "team-member__avatar");
    			if (!src_url_equal(img24.src, img24_src_value = "img/ava7.png")) attr_dev(img24, "src", img24_src_value);
    			attr_dev(img24, "alt", "");
    			add_location(img24, file$6, 97, 20, 5565);
    			attr_dev(div33, "class", "team-member__name");
    			add_location(div33, file$6, 99, 24, 5704);
    			attr_dev(div34, "class", "team-member__post");
    			add_location(div34, file$6, 100, 24, 5779);
    			if (!src_url_equal(img25.src, img25_src_value = "img/facebook.svg")) attr_dev(img25, "src", img25_src_value);
    			attr_dev(img25, "alt", "");
    			add_location(img25, file$6, 102, 44, 5930);
    			attr_dev(a18, "href", "#");
    			add_location(a18, file$6, 102, 32, 5918);
    			add_location(li18, file$6, 102, 28, 5914);
    			if (!src_url_equal(img26.src, img26_src_value = "img/linkedin.svg")) attr_dev(img26, "src", img26_src_value);
    			attr_dev(img26, "alt", "");
    			add_location(img26, file$6, 103, 44, 6019);
    			attr_dev(a19, "href", "#");
    			add_location(a19, file$6, 103, 32, 6007);
    			add_location(li19, file$6, 103, 28, 6003);
    			if (!src_url_equal(img27.src, img27_src_value = "img/google-plus.svg")) attr_dev(img27, "src", img27_src_value);
    			attr_dev(img27, "alt", "");
    			add_location(img27, file$6, 104, 44, 6108);
    			attr_dev(a20, "href", "#");
    			add_location(a20, file$6, 104, 32, 6096);
    			add_location(li20, file$6, 104, 28, 6092);
    			attr_dev(ul6, "class", "team-member__social");
    			add_location(ul6, file$6, 101, 24, 5853);
    			attr_dev(div35, "class", "team-member__content");
    			add_location(div35, file$6, 98, 20, 5645);
    			attr_dev(div36, "class", "team-member");
    			add_location(div36, file$6, 96, 16, 5519);
    			attr_dev(div37, "data-aos", "fade-right");
    			attr_dev(div37, "data-aos-delay", "200");
    			attr_dev(div37, "class", "col-lg-4 col-xl-3 col-6");
    			add_location(div37, file$6, 95, 12, 5422);
    			attr_dev(img28, "class", "team-member__avatar");
    			if (!src_url_equal(img28.src, img28_src_value = "img/ava8.png")) attr_dev(img28, "src", img28_src_value);
    			attr_dev(img28, "alt", "");
    			add_location(img28, file$6, 111, 20, 6410);
    			attr_dev(div38, "class", "team-member__name");
    			add_location(div38, file$6, 113, 24, 6549);
    			attr_dev(div39, "class", "team-member__post");
    			add_location(div39, file$6, 114, 24, 6621);
    			if (!src_url_equal(img29.src, img29_src_value = "img/facebook.svg")) attr_dev(img29, "src", img29_src_value);
    			attr_dev(img29, "alt", "");
    			add_location(img29, file$6, 116, 44, 6776);
    			attr_dev(a21, "href", "#");
    			add_location(a21, file$6, 116, 32, 6764);
    			add_location(li21, file$6, 116, 28, 6760);
    			if (!src_url_equal(img30.src, img30_src_value = "img/linkedin.svg")) attr_dev(img30, "src", img30_src_value);
    			attr_dev(img30, "alt", "");
    			add_location(img30, file$6, 117, 44, 6865);
    			attr_dev(a22, "href", "#");
    			add_location(a22, file$6, 117, 32, 6853);
    			add_location(li22, file$6, 117, 28, 6849);
    			if (!src_url_equal(img31.src, img31_src_value = "img/google-plus.svg")) attr_dev(img31, "src", img31_src_value);
    			attr_dev(img31, "alt", "");
    			add_location(img31, file$6, 118, 44, 6954);
    			attr_dev(a23, "href", "#");
    			add_location(a23, file$6, 118, 32, 6942);
    			add_location(li23, file$6, 118, 28, 6938);
    			attr_dev(ul7, "class", "team-member__social");
    			add_location(ul7, file$6, 115, 24, 6699);
    			attr_dev(div40, "class", "team-member__content");
    			add_location(div40, file$6, 112, 20, 6490);
    			attr_dev(div41, "class", "team-member");
    			add_location(div41, file$6, 110, 16, 6364);
    			attr_dev(div42, "data-aos", "fade-right");
    			attr_dev(div42, "data-aos-delay", "300");
    			attr_dev(div42, "class", "col-lg-4 col-xl-3 col-6");
    			add_location(div42, file$6, 109, 12, 6267);
    			attr_dev(img32, "class", "team-member__avatar");
    			if (!src_url_equal(img32.src, img32_src_value = "img/ava9.png")) attr_dev(img32, "src", img32_src_value);
    			attr_dev(img32, "alt", "");
    			add_location(img32, file$6, 125, 20, 7235);
    			attr_dev(div43, "class", "team-member__name");
    			add_location(div43, file$6, 127, 24, 7374);
    			attr_dev(div44, "class", "team-member__post");
    			add_location(div44, file$6, 128, 24, 7447);
    			if (!src_url_equal(img33.src, img33_src_value = "img/facebook.svg")) attr_dev(img33, "src", img33_src_value);
    			attr_dev(img33, "alt", "");
    			add_location(img33, file$6, 130, 44, 7593);
    			attr_dev(a24, "href", "#");
    			add_location(a24, file$6, 130, 32, 7581);
    			add_location(li24, file$6, 130, 28, 7577);
    			if (!src_url_equal(img34.src, img34_src_value = "img/linkedin.svg")) attr_dev(img34, "src", img34_src_value);
    			attr_dev(img34, "alt", "");
    			add_location(img34, file$6, 131, 44, 7682);
    			attr_dev(a25, "href", "#");
    			add_location(a25, file$6, 131, 32, 7670);
    			add_location(li25, file$6, 131, 28, 7666);
    			if (!src_url_equal(img35.src, img35_src_value = "img/google-plus.svg")) attr_dev(img35, "src", img35_src_value);
    			attr_dev(img35, "alt", "");
    			add_location(img35, file$6, 132, 44, 7771);
    			attr_dev(a26, "href", "#");
    			add_location(a26, file$6, 132, 32, 7759);
    			add_location(li26, file$6, 132, 28, 7755);
    			attr_dev(ul8, "class", "team-member__social");
    			add_location(ul8, file$6, 129, 24, 7516);
    			attr_dev(div45, "class", "team-member__content");
    			add_location(div45, file$6, 126, 20, 7315);
    			attr_dev(div46, "class", "team-member");
    			add_location(div46, file$6, 124, 16, 7189);
    			attr_dev(div47, "data-aos", "fade-right");
    			attr_dev(div47, "class", "col-lg-4 col-xl-3 col-6");
    			add_location(div47, file$6, 123, 12, 7113);
    			attr_dev(img36, "class", "team-member__avatar");
    			if (!src_url_equal(img36.src, img36_src_value = "img/ava10.png")) attr_dev(img36, "src", img36_src_value);
    			attr_dev(img36, "alt", "");
    			add_location(img36, file$6, 139, 20, 8073);
    			attr_dev(div48, "class", "team-member__name");
    			add_location(div48, file$6, 141, 24, 8213);
    			attr_dev(div49, "class", "team-member__post");
    			add_location(div49, file$6, 142, 24, 8288);
    			if (!src_url_equal(img37.src, img37_src_value = "img/facebook.svg")) attr_dev(img37, "src", img37_src_value);
    			attr_dev(img37, "alt", "");
    			add_location(img37, file$6, 144, 44, 8437);
    			attr_dev(a27, "href", "#");
    			add_location(a27, file$6, 144, 32, 8425);
    			add_location(li27, file$6, 144, 28, 8421);
    			if (!src_url_equal(img38.src, img38_src_value = "img/linkedin.svg")) attr_dev(img38, "src", img38_src_value);
    			attr_dev(img38, "alt", "");
    			add_location(img38, file$6, 145, 44, 8526);
    			attr_dev(a28, "href", "#");
    			add_location(a28, file$6, 145, 32, 8514);
    			add_location(li28, file$6, 145, 28, 8510);
    			if (!src_url_equal(img39.src, img39_src_value = "img/google-plus.svg")) attr_dev(img39, "src", img39_src_value);
    			attr_dev(img39, "alt", "");
    			add_location(img39, file$6, 146, 44, 8615);
    			attr_dev(a29, "href", "#");
    			add_location(a29, file$6, 146, 32, 8603);
    			add_location(li29, file$6, 146, 28, 8599);
    			attr_dev(ul9, "class", "team-member__social");
    			add_location(ul9, file$6, 143, 24, 8360);
    			attr_dev(div50, "class", "team-member__content");
    			add_location(div50, file$6, 140, 20, 8154);
    			attr_dev(div51, "class", "team-member");
    			add_location(div51, file$6, 138, 16, 8027);
    			attr_dev(div52, "data-aos", "fade-right");
    			attr_dev(div52, "data-aos-delay", "100");
    			attr_dev(div52, "class", "col-lg-4 col-xl-3 col-6");
    			add_location(div52, file$6, 137, 12, 7930);
    			attr_dev(img40, "class", "team-member__avatar");
    			if (!src_url_equal(img40.src, img40_src_value = "img/ava11.png")) attr_dev(img40, "src", img40_src_value);
    			attr_dev(img40, "alt", "");
    			add_location(img40, file$6, 153, 20, 8917);
    			attr_dev(div53, "class", "team-member__name");
    			add_location(div53, file$6, 155, 24, 9057);
    			attr_dev(div54, "class", "team-member__post");
    			add_location(div54, file$6, 156, 24, 9129);
    			if (!src_url_equal(img41.src, img41_src_value = "img/facebook.svg")) attr_dev(img41, "src", img41_src_value);
    			attr_dev(img41, "alt", "");
    			add_location(img41, file$6, 158, 44, 9277);
    			attr_dev(a30, "href", "#");
    			add_location(a30, file$6, 158, 32, 9265);
    			add_location(li30, file$6, 158, 28, 9261);
    			if (!src_url_equal(img42.src, img42_src_value = "img/linkedin.svg")) attr_dev(img42, "src", img42_src_value);
    			attr_dev(img42, "alt", "");
    			add_location(img42, file$6, 159, 44, 9366);
    			attr_dev(a31, "href", "#");
    			add_location(a31, file$6, 159, 32, 9354);
    			add_location(li31, file$6, 159, 28, 9350);
    			if (!src_url_equal(img43.src, img43_src_value = "img/google-plus.svg")) attr_dev(img43, "src", img43_src_value);
    			attr_dev(img43, "alt", "");
    			add_location(img43, file$6, 160, 44, 9455);
    			attr_dev(a32, "href", "#");
    			add_location(a32, file$6, 160, 32, 9443);
    			add_location(li32, file$6, 160, 28, 9439);
    			attr_dev(ul10, "class", "team-member__social");
    			add_location(ul10, file$6, 157, 24, 9200);
    			attr_dev(div55, "class", "team-member__content");
    			add_location(div55, file$6, 154, 20, 8998);
    			attr_dev(div56, "class", "team-member");
    			add_location(div56, file$6, 152, 16, 8871);
    			attr_dev(div57, "data-aos", "fade-right");
    			attr_dev(div57, "data-aos-delay", "200");
    			attr_dev(div57, "class", "col-lg-4 col-xl-3 col-6");
    			add_location(div57, file$6, 151, 12, 8774);
    			attr_dev(img44, "class", "team-member__avatar");
    			if (!src_url_equal(img44.src, img44_src_value = "img/ava12.png")) attr_dev(img44, "src", img44_src_value);
    			attr_dev(img44, "alt", "");
    			add_location(img44, file$6, 167, 20, 9757);
    			attr_dev(div58, "class", "team-member__name");
    			add_location(div58, file$6, 169, 24, 9897);
    			attr_dev(div59, "class", "team-member__post");
    			add_location(div59, file$6, 170, 24, 9968);
    			if (!src_url_equal(img45.src, img45_src_value = "img/facebook.svg")) attr_dev(img45, "src", img45_src_value);
    			attr_dev(img45, "alt", "");
    			add_location(img45, file$6, 172, 44, 10117);
    			attr_dev(a33, "href", "#");
    			add_location(a33, file$6, 172, 32, 10105);
    			add_location(li33, file$6, 172, 28, 10101);
    			if (!src_url_equal(img46.src, img46_src_value = "img/linkedin.svg")) attr_dev(img46, "src", img46_src_value);
    			attr_dev(img46, "alt", "");
    			add_location(img46, file$6, 173, 44, 10206);
    			attr_dev(a34, "href", "#");
    			add_location(a34, file$6, 173, 32, 10194);
    			add_location(li34, file$6, 173, 28, 10190);
    			if (!src_url_equal(img47.src, img47_src_value = "img/google-plus.svg")) attr_dev(img47, "src", img47_src_value);
    			attr_dev(img47, "alt", "");
    			add_location(img47, file$6, 174, 44, 10295);
    			attr_dev(a35, "href", "#");
    			add_location(a35, file$6, 174, 32, 10283);
    			add_location(li35, file$6, 174, 28, 10279);
    			attr_dev(ul11, "class", "team-member__social");
    			add_location(ul11, file$6, 171, 24, 10040);
    			attr_dev(div60, "class", "team-member__content");
    			add_location(div60, file$6, 168, 20, 9838);
    			attr_dev(div61, "class", "team-member");
    			add_location(div61, file$6, 166, 16, 9711);
    			attr_dev(div62, "data-aos", "fade-right");
    			attr_dev(div62, "data-aos-delay", "300");
    			attr_dev(div62, "class", "col-lg-4 col-xl-3 col-6");
    			add_location(div62, file$6, 165, 12, 9614);
    			attr_dev(div63, "class", "row");
    			add_location(div63, file$6, 10, 8, 387);
    			attr_dev(div64, "class", "container");
    			add_location(div64, file$6, 1, 4, 65);
    			if (!src_url_equal(img48.src, img48_src_value = "img/team-bg.png")) attr_dev(img48, "src", img48_src_value);
    			attr_dev(img48, "data-jarallax-element", "40");
    			attr_dev(img48, "alt", "");
    			attr_dev(img48, "class", "team__bg");
    			add_location(img48, file$6, 181, 4, 10472);
    			attr_dev(section, "class", "section section--no-pad-top team");
    			attr_dev(section, "id", "team");
    			add_location(section, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div64);
    			append_dev(div64, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(div64, t3);
    			append_dev(div64, div63);
    			append_dev(div63, div7);
    			append_dev(div7, div6);
    			append_dev(div6, img0);
    			append_dev(div6, t4);
    			append_dev(div6, div5);
    			append_dev(div5, div3);
    			append_dev(div5, t6);
    			append_dev(div5, div4);
    			append_dev(div5, t8);
    			append_dev(div5, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			append_dev(a0, img1);
    			append_dev(ul0, t9);
    			append_dev(ul0, li1);
    			append_dev(li1, a1);
    			append_dev(a1, img2);
    			append_dev(ul0, t10);
    			append_dev(ul0, li2);
    			append_dev(li2, a2);
    			append_dev(a2, img3);
    			append_dev(div63, t11);
    			append_dev(div63, div12);
    			append_dev(div12, div11);
    			append_dev(div11, img4);
    			append_dev(div11, t12);
    			append_dev(div11, div10);
    			append_dev(div10, div8);
    			append_dev(div10, t14);
    			append_dev(div10, div9);
    			append_dev(div10, t16);
    			append_dev(div10, ul1);
    			append_dev(ul1, li3);
    			append_dev(li3, a3);
    			append_dev(a3, img5);
    			append_dev(ul1, t17);
    			append_dev(ul1, li4);
    			append_dev(li4, a4);
    			append_dev(a4, img6);
    			append_dev(ul1, t18);
    			append_dev(ul1, li5);
    			append_dev(li5, a5);
    			append_dev(a5, img7);
    			append_dev(div63, t19);
    			append_dev(div63, div17);
    			append_dev(div17, div16);
    			append_dev(div16, img8);
    			append_dev(div16, t20);
    			append_dev(div16, div15);
    			append_dev(div15, div13);
    			append_dev(div15, t22);
    			append_dev(div15, div14);
    			append_dev(div15, t24);
    			append_dev(div15, ul2);
    			append_dev(ul2, li6);
    			append_dev(li6, a6);
    			append_dev(a6, img9);
    			append_dev(ul2, t25);
    			append_dev(ul2, li7);
    			append_dev(li7, a7);
    			append_dev(a7, img10);
    			append_dev(ul2, t26);
    			append_dev(ul2, li8);
    			append_dev(li8, a8);
    			append_dev(a8, img11);
    			append_dev(div63, t27);
    			append_dev(div63, div22);
    			append_dev(div22, div21);
    			append_dev(div21, img12);
    			append_dev(div21, t28);
    			append_dev(div21, div20);
    			append_dev(div20, div18);
    			append_dev(div20, t30);
    			append_dev(div20, div19);
    			append_dev(div20, t32);
    			append_dev(div20, ul3);
    			append_dev(ul3, li9);
    			append_dev(li9, a9);
    			append_dev(a9, img13);
    			append_dev(ul3, t33);
    			append_dev(ul3, li10);
    			append_dev(li10, a10);
    			append_dev(a10, img14);
    			append_dev(ul3, t34);
    			append_dev(ul3, li11);
    			append_dev(li11, a11);
    			append_dev(a11, img15);
    			append_dev(div63, t35);
    			append_dev(div63, div27);
    			append_dev(div27, div26);
    			append_dev(div26, img16);
    			append_dev(div26, t36);
    			append_dev(div26, div25);
    			append_dev(div25, div23);
    			append_dev(div25, t38);
    			append_dev(div25, div24);
    			append_dev(div25, t40);
    			append_dev(div25, ul4);
    			append_dev(ul4, li12);
    			append_dev(li12, a12);
    			append_dev(a12, img17);
    			append_dev(ul4, t41);
    			append_dev(ul4, li13);
    			append_dev(li13, a13);
    			append_dev(a13, img18);
    			append_dev(ul4, t42);
    			append_dev(ul4, li14);
    			append_dev(li14, a14);
    			append_dev(a14, img19);
    			append_dev(div63, t43);
    			append_dev(div63, div32);
    			append_dev(div32, div31);
    			append_dev(div31, img20);
    			append_dev(div31, t44);
    			append_dev(div31, div30);
    			append_dev(div30, div28);
    			append_dev(div30, t46);
    			append_dev(div30, div29);
    			append_dev(div30, t48);
    			append_dev(div30, ul5);
    			append_dev(ul5, li15);
    			append_dev(li15, a15);
    			append_dev(a15, img21);
    			append_dev(ul5, t49);
    			append_dev(ul5, li16);
    			append_dev(li16, a16);
    			append_dev(a16, img22);
    			append_dev(ul5, t50);
    			append_dev(ul5, li17);
    			append_dev(li17, a17);
    			append_dev(a17, img23);
    			append_dev(div63, t51);
    			append_dev(div63, div37);
    			append_dev(div37, div36);
    			append_dev(div36, img24);
    			append_dev(div36, t52);
    			append_dev(div36, div35);
    			append_dev(div35, div33);
    			append_dev(div35, t54);
    			append_dev(div35, div34);
    			append_dev(div35, t56);
    			append_dev(div35, ul6);
    			append_dev(ul6, li18);
    			append_dev(li18, a18);
    			append_dev(a18, img25);
    			append_dev(ul6, t57);
    			append_dev(ul6, li19);
    			append_dev(li19, a19);
    			append_dev(a19, img26);
    			append_dev(ul6, t58);
    			append_dev(ul6, li20);
    			append_dev(li20, a20);
    			append_dev(a20, img27);
    			append_dev(div63, t59);
    			append_dev(div63, div42);
    			append_dev(div42, div41);
    			append_dev(div41, img28);
    			append_dev(div41, t60);
    			append_dev(div41, div40);
    			append_dev(div40, div38);
    			append_dev(div40, t62);
    			append_dev(div40, div39);
    			append_dev(div40, t64);
    			append_dev(div40, ul7);
    			append_dev(ul7, li21);
    			append_dev(li21, a21);
    			append_dev(a21, img29);
    			append_dev(ul7, t65);
    			append_dev(ul7, li22);
    			append_dev(li22, a22);
    			append_dev(a22, img30);
    			append_dev(ul7, t66);
    			append_dev(ul7, li23);
    			append_dev(li23, a23);
    			append_dev(a23, img31);
    			append_dev(div63, t67);
    			append_dev(div63, div47);
    			append_dev(div47, div46);
    			append_dev(div46, img32);
    			append_dev(div46, t68);
    			append_dev(div46, div45);
    			append_dev(div45, div43);
    			append_dev(div45, t70);
    			append_dev(div45, div44);
    			append_dev(div45, t72);
    			append_dev(div45, ul8);
    			append_dev(ul8, li24);
    			append_dev(li24, a24);
    			append_dev(a24, img33);
    			append_dev(ul8, t73);
    			append_dev(ul8, li25);
    			append_dev(li25, a25);
    			append_dev(a25, img34);
    			append_dev(ul8, t74);
    			append_dev(ul8, li26);
    			append_dev(li26, a26);
    			append_dev(a26, img35);
    			append_dev(div63, t75);
    			append_dev(div63, div52);
    			append_dev(div52, div51);
    			append_dev(div51, img36);
    			append_dev(div51, t76);
    			append_dev(div51, div50);
    			append_dev(div50, div48);
    			append_dev(div50, t78);
    			append_dev(div50, div49);
    			append_dev(div50, t80);
    			append_dev(div50, ul9);
    			append_dev(ul9, li27);
    			append_dev(li27, a27);
    			append_dev(a27, img37);
    			append_dev(ul9, t81);
    			append_dev(ul9, li28);
    			append_dev(li28, a28);
    			append_dev(a28, img38);
    			append_dev(ul9, t82);
    			append_dev(ul9, li29);
    			append_dev(li29, a29);
    			append_dev(a29, img39);
    			append_dev(div63, t83);
    			append_dev(div63, div57);
    			append_dev(div57, div56);
    			append_dev(div56, img40);
    			append_dev(div56, t84);
    			append_dev(div56, div55);
    			append_dev(div55, div53);
    			append_dev(div55, t86);
    			append_dev(div55, div54);
    			append_dev(div55, t88);
    			append_dev(div55, ul10);
    			append_dev(ul10, li30);
    			append_dev(li30, a30);
    			append_dev(a30, img41);
    			append_dev(ul10, t89);
    			append_dev(ul10, li31);
    			append_dev(li31, a31);
    			append_dev(a31, img42);
    			append_dev(ul10, t90);
    			append_dev(ul10, li32);
    			append_dev(li32, a32);
    			append_dev(a32, img43);
    			append_dev(div63, t91);
    			append_dev(div63, div62);
    			append_dev(div62, div61);
    			append_dev(div61, img44);
    			append_dev(div61, t92);
    			append_dev(div61, div60);
    			append_dev(div60, div58);
    			append_dev(div60, t94);
    			append_dev(div60, div59);
    			append_dev(div60, t96);
    			append_dev(div60, ul11);
    			append_dev(ul11, li33);
    			append_dev(li33, a33);
    			append_dev(a33, img45);
    			append_dev(ul11, t97);
    			append_dev(ul11, li34);
    			append_dev(li34, a34);
    			append_dev(a34, img46);
    			append_dev(ul11, t98);
    			append_dev(ul11, li35);
    			append_dev(li35, a35);
    			append_dev(a35, img47);
    			append_dev(section, t99);
    			append_dev(section, img48);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Team', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Team> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Team extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Team",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/inc/news.svelte generated by Svelte v3.44.0 */

    const file$5 = "src/inc/news.svelte";

    function create_fragment$5(ctx) {
    	let section;
    	let div18;
    	let div2;
    	let div1;
    	let div0;
    	let h4;
    	let t1;
    	let h2;
    	let t3;
    	let div17;
    	let div16;
    	let div15;
    	let a0;
    	let div5;
    	let div3;
    	let t5;
    	let h30;
    	let t7;
    	let p0;
    	let t9;
    	let div4;
    	let t11;
    	let a1;
    	let div8;
    	let div6;
    	let t13;
    	let h31;
    	let t15;
    	let p1;
    	let t17;
    	let div7;
    	let t19;
    	let a2;
    	let div11;
    	let div9;
    	let t21;
    	let h32;
    	let t23;
    	let p2;
    	let t25;
    	let div10;
    	let t27;
    	let a3;
    	let div14;
    	let div12;
    	let t29;
    	let h33;
    	let t31;
    	let p3;
    	let t33;
    	let div13;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div18 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "In the world";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Latest News";
    			t3 = space();
    			div17 = element("div");
    			div16 = element("div");
    			div15 = element("div");
    			a0 = element("a");
    			div5 = element("div");
    			div3 = element("div");
    			div3.textContent = "Cryptocurrency";
    			t5 = space();
    			h30 = element("h3");
    			h30.textContent = "New trends in UI/UX Design World Integration";
    			t7 = space();
    			p0 = element("p");
    			p0.textContent = "Specially for our VIP customers the LH Crypto team representatives Alexander Smirnov and Antonis Lapos will conduct a number of personal meet-";
    			t9 = space();
    			div4 = element("div");
    			div4.textContent = "September, 15 2017";
    			t11 = space();
    			a1 = element("a");
    			div8 = element("div");
    			div6 = element("div");
    			div6.textContent = "Cryptocurrency";
    			t13 = space();
    			h31 = element("h3");
    			h31.textContent = "New trends in UI/UX Design World Integration";
    			t15 = space();
    			p1 = element("p");
    			p1.textContent = "Specially for our VIP customers the LH Crypto team representatives Alexander Smirnov and Antonis Lapos will conduct a number of personal meet-";
    			t17 = space();
    			div7 = element("div");
    			div7.textContent = "September, 15 2017";
    			t19 = space();
    			a2 = element("a");
    			div11 = element("div");
    			div9 = element("div");
    			div9.textContent = "Cryptocurrency";
    			t21 = space();
    			h32 = element("h3");
    			h32.textContent = "New trends in UI/UX Design World Integration";
    			t23 = space();
    			p2 = element("p");
    			p2.textContent = "Specially for our VIP customers the LH Crypto team representatives Alexander Smirnov and Antonis Lapos will conduct a number of personal meet-";
    			t25 = space();
    			div10 = element("div");
    			div10.textContent = "September, 15 2017";
    			t27 = space();
    			a3 = element("a");
    			div14 = element("div");
    			div12 = element("div");
    			div12.textContent = "Cryptocurrency";
    			t29 = space();
    			h33 = element("h3");
    			h33.textContent = "New trends in UI/UX Design World Integration";
    			t31 = space();
    			p3 = element("p");
    			p3.textContent = "Specially for our VIP customers the LH Crypto team representatives Alexander Smirnov and Antonis Lapos will conduct a number of personal meet-";
    			t33 = space();
    			div13 = element("div");
    			div13.textContent = "September, 15 2017";
    			add_location(h4, file$5, 5, 20, 224);
    			add_location(h2, file$5, 6, 20, 266);
    			attr_dev(div0, "class", "section-header section-header--center section-header--small-margin");
    			add_location(div0, file$5, 4, 16, 123);
    			attr_dev(div1, "class", "col");
    			add_location(div1, file$5, 3, 12, 89);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$5, 2, 8, 59);
    			attr_dev(div3, "class", "news-carousel__item-subtitle");
    			add_location(div3, file$5, 16, 28, 629);
    			attr_dev(h30, "class", "news-carousel__item-title");
    			add_location(h30, file$5, 17, 28, 720);
    			add_location(p0, file$5, 20, 28, 898);
    			attr_dev(div4, "class", "news-carousel__item-data");
    			add_location(div4, file$5, 23, 28, 1138);
    			attr_dev(div5, "class", "news-carousel__item-body");
    			add_location(div5, file$5, 15, 24, 562);
    			attr_dev(a0, "data-aos", "fade-up");
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "news-carousel__item");
    			add_location(a0, file$5, 14, 20, 478);
    			attr_dev(div6, "class", "news-carousel__item-subtitle");
    			add_location(div6, file$5, 31, 28, 1512);
    			attr_dev(h31, "class", "news-carousel__item-title");
    			add_location(h31, file$5, 32, 28, 1603);
    			add_location(p1, file$5, 35, 28, 1781);
    			attr_dev(div7, "class", "news-carousel__item-data");
    			add_location(div7, file$5, 38, 28, 2021);
    			attr_dev(div8, "class", "news-carousel__item-body");
    			add_location(div8, file$5, 30, 24, 1445);
    			attr_dev(a1, "data-aos", "fade-up");
    			attr_dev(a1, "data-aos-delay", "200");
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "news-carousel__item");
    			add_location(a1, file$5, 29, 20, 1340);
    			attr_dev(div9, "class", "news-carousel__item-subtitle");
    			add_location(div9, file$5, 46, 28, 2395);
    			attr_dev(h32, "class", "news-carousel__item-title");
    			add_location(h32, file$5, 47, 28, 2486);
    			add_location(p2, file$5, 50, 28, 2664);
    			attr_dev(div10, "class", "news-carousel__item-data");
    			add_location(div10, file$5, 53, 28, 2904);
    			attr_dev(div11, "class", "news-carousel__item-body");
    			add_location(div11, file$5, 45, 24, 2328);
    			attr_dev(a2, "data-aos", "fade-up");
    			attr_dev(a2, "data-aos-delay", "200");
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "class", "news-carousel__item");
    			add_location(a2, file$5, 44, 20, 2223);
    			attr_dev(div12, "class", "news-carousel__item-subtitle");
    			add_location(div12, file$5, 61, 28, 3238);
    			attr_dev(h33, "class", "news-carousel__item-title");
    			add_location(h33, file$5, 62, 28, 3329);
    			add_location(p3, file$5, 65, 28, 3507);
    			attr_dev(div13, "class", "news-carousel__item-data");
    			add_location(div13, file$5, 68, 28, 3747);
    			attr_dev(div14, "class", "news-carousel__item-body");
    			add_location(div14, file$5, 60, 24, 3171);
    			attr_dev(a3, "href", "#");
    			attr_dev(a3, "class", "news-carousel__item");
    			add_location(a3, file$5, 59, 20, 3106);
    			attr_dev(div15, "class", "news-carousel owl-carousel");
    			add_location(div15, file$5, 13, 16, 417);
    			attr_dev(div16, "class", "col");
    			add_location(div16, file$5, 11, 12, 382);
    			attr_dev(div17, "class", "row");
    			add_location(div17, file$5, 10, 8, 352);
    			attr_dev(div18, "class", "container");
    			add_location(div18, file$5, 1, 4, 27);
    			attr_dev(section, "class", "news");
    			add_location(section, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div18);
    			append_dev(div18, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(div18, t3);
    			append_dev(div18, div17);
    			append_dev(div17, div16);
    			append_dev(div16, div15);
    			append_dev(div15, a0);
    			append_dev(a0, div5);
    			append_dev(div5, div3);
    			append_dev(div5, t5);
    			append_dev(div5, h30);
    			append_dev(div5, t7);
    			append_dev(div5, p0);
    			append_dev(div5, t9);
    			append_dev(div5, div4);
    			append_dev(div15, t11);
    			append_dev(div15, a1);
    			append_dev(a1, div8);
    			append_dev(div8, div6);
    			append_dev(div8, t13);
    			append_dev(div8, h31);
    			append_dev(div8, t15);
    			append_dev(div8, p1);
    			append_dev(div8, t17);
    			append_dev(div8, div7);
    			append_dev(div15, t19);
    			append_dev(div15, a2);
    			append_dev(a2, div11);
    			append_dev(div11, div9);
    			append_dev(div11, t21);
    			append_dev(div11, h32);
    			append_dev(div11, t23);
    			append_dev(div11, p2);
    			append_dev(div11, t25);
    			append_dev(div11, div10);
    			append_dev(div15, t27);
    			append_dev(div15, a3);
    			append_dev(a3, div14);
    			append_dev(div14, div12);
    			append_dev(div14, t29);
    			append_dev(div14, h33);
    			append_dev(div14, t31);
    			append_dev(div14, p3);
    			append_dev(div14, t33);
    			append_dev(div14, div13);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('News', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<News> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class News extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "News",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/inc/press.svelte generated by Svelte v3.44.0 */

    const file$4 = "src/inc/press.svelte";

    function create_fragment$4(ctx) {
    	let section;
    	let div8;
    	let div2;
    	let div1;
    	let div0;
    	let h4;
    	let t1;
    	let h2;
    	let t3;
    	let div7;
    	let div3;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let div4;
    	let a1;
    	let img1;
    	let img1_src_value;
    	let t5;
    	let div5;
    	let a2;
    	let img2;
    	let img2_src_value;
    	let t6;
    	let div6;
    	let a3;
    	let img3;
    	let img3_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div8 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Press About us";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Press About Cryptoland";
    			t3 = space();
    			div7 = element("div");
    			div3 = element("div");
    			a0 = element("a");
    			img0 = element("img");
    			t4 = space();
    			div4 = element("div");
    			a1 = element("a");
    			img1 = element("img");
    			t5 = space();
    			div5 = element("div");
    			a2 = element("a");
    			img2 = element("img");
    			t6 = space();
    			div6 = element("div");
    			a3 = element("a");
    			img3 = element("img");
    			add_location(h4, file$4, 5, 20, 234);
    			add_location(h2, file$4, 6, 20, 278);
    			attr_dev(div0, "class", "section-header section-header--center section-header--medium-margin");
    			add_location(div0, file$4, 4, 16, 132);
    			attr_dev(div1, "class", "col");
    			add_location(div1, file$4, 3, 12, 98);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$4, 2, 8, 68);
    			if (!src_url_equal(img0.src, img0_src_value = "img/press-logo-1.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$4, 13, 20, 513);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "press__item");
    			add_location(a0, file$4, 12, 16, 460);
    			attr_dev(div3, "class", "col-lg-3 col-12 col-sm-6");
    			add_location(div3, file$4, 11, 12, 405);
    			if (!src_url_equal(img1.src, img1_src_value = "img/press-logo-2.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$4, 18, 20, 713);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "press__item");
    			add_location(a1, file$4, 17, 16, 660);
    			attr_dev(div4, "class", "col-lg-3 col-12 col-sm-6");
    			add_location(div4, file$4, 16, 12, 605);
    			if (!src_url_equal(img2.src, img2_src_value = "img/press-logo-3.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$4, 23, 20, 913);
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "class", "press__item");
    			add_location(a2, file$4, 22, 16, 860);
    			attr_dev(div5, "class", "col-lg-3 col-12 col-sm-6");
    			add_location(div5, file$4, 21, 12, 805);
    			if (!src_url_equal(img3.src, img3_src_value = "img/press-logo-4.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$4, 28, 20, 1113);
    			attr_dev(a3, "href", "#");
    			attr_dev(a3, "class", "press__item");
    			add_location(a3, file$4, 27, 16, 1060);
    			attr_dev(div6, "class", "col-lg-3 col-12 col-sm-6");
    			add_location(div6, file$4, 26, 12, 1005);
    			attr_dev(div7, "class", "row");
    			add_location(div7, file$4, 10, 8, 375);
    			attr_dev(div8, "class", "container");
    			add_location(div8, file$4, 1, 4, 36);
    			attr_dev(section, "class", "press section");
    			add_location(section, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div8);
    			append_dev(div8, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(div8, t3);
    			append_dev(div8, div7);
    			append_dev(div7, div3);
    			append_dev(div3, a0);
    			append_dev(a0, img0);
    			append_dev(div7, t4);
    			append_dev(div7, div4);
    			append_dev(div4, a1);
    			append_dev(a1, img1);
    			append_dev(div7, t5);
    			append_dev(div7, div5);
    			append_dev(div5, a2);
    			append_dev(a2, img2);
    			append_dev(div7, t6);
    			append_dev(div7, div6);
    			append_dev(div6, a3);
    			append_dev(a3, img3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Press', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Press> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Press extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Press",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/inc/partner.svelte generated by Svelte v3.44.0 */

    const file$3 = "src/inc/partner.svelte";

    function create_fragment$3(ctx) {
    	let section;
    	let div9;
    	let div8;
    	let div7;
    	let div0;
    	let h4;
    	let t1;
    	let h2;
    	let t3;
    	let div6;
    	let div1;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let div2;
    	let img1;
    	let img1_src_value;
    	let t5;
    	let div3;
    	let img2;
    	let img2_src_value;
    	let t6;
    	let div4;
    	let img3;
    	let img3_src_value;
    	let t7;
    	let div5;
    	let img4;
    	let img4_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Our friends";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Partners";
    			t3 = space();
    			div6 = element("div");
    			div1 = element("div");
    			img0 = element("img");
    			t4 = space();
    			div2 = element("div");
    			img1 = element("img");
    			t5 = space();
    			div3 = element("div");
    			img2 = element("img");
    			t6 = space();
    			div4 = element("div");
    			img3 = element("img");
    			t7 = space();
    			div5 = element("div");
    			img4 = element("img");
    			add_location(h4, file$3, 5, 20, 227);
    			add_location(h2, file$3, 6, 20, 268);
    			attr_dev(div0, "class", "section-header section-header--tire section-header--medium-margin");
    			add_location(div0, file$3, 4, 16, 127);
    			if (!src_url_equal(img0.src, img0_src_value = "img/partners-logo-1.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$3, 11, 24, 397);
    			add_location(div1, file$3, 10, 20, 367);
    			if (!src_url_equal(img1.src, img1_src_value = "img/partners-logo-2.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$3, 14, 24, 517);
    			add_location(div2, file$3, 13, 20, 487);
    			if (!src_url_equal(img2.src, img2_src_value = "img/partners-logo-3.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$3, 17, 24, 637);
    			add_location(div3, file$3, 16, 20, 607);
    			if (!src_url_equal(img3.src, img3_src_value = "img/partners-logo-4.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$3, 20, 24, 757);
    			add_location(div4, file$3, 19, 20, 727);
    			if (!src_url_equal(img4.src, img4_src_value = "img/partners-logo-5.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$3, 23, 24, 877);
    			add_location(div5, file$3, 22, 20, 847);
    			attr_dev(div6, "class", "logoes");
    			add_location(div6, file$3, 9, 16, 326);
    			attr_dev(div7, "class", "col");
    			add_location(div7, file$3, 3, 12, 93);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file$3, 2, 8, 63);
    			attr_dev(div9, "class", "container");
    			add_location(div9, file$3, 1, 4, 31);
    			attr_dev(section, "class", "partners");
    			add_location(section, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(div7, t3);
    			append_dev(div7, div6);
    			append_dev(div6, div1);
    			append_dev(div1, img0);
    			append_dev(div6, t4);
    			append_dev(div6, div2);
    			append_dev(div2, img1);
    			append_dev(div6, t5);
    			append_dev(div6, div3);
    			append_dev(div3, img2);
    			append_dev(div6, t6);
    			append_dev(div6, div4);
    			append_dev(div4, img3);
    			append_dev(div6, t7);
    			append_dev(div6, div5);
    			append_dev(div5, img4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Partner', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Partner> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Partner extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Partner",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/inc/contact.svelte generated by Svelte v3.44.0 */

    const file$2 = "src/inc/contact.svelte";

    function create_fragment$2(ctx) {
    	let section;
    	let div3;
    	let div2;
    	let div1;
    	let div0;
    	let h4;
    	let t1;
    	let h2;
    	let t3;
    	let form;
    	let input0;
    	let t4;
    	let input1;
    	let t5;
    	let textarea;
    	let t6;
    	let button;
    	let span;
    	let t8;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Contact us";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Get in Touch";
    			t3 = space();
    			form = element("form");
    			input0 = element("input");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			textarea = element("textarea");
    			t6 = space();
    			button = element("button");
    			span = element("span");
    			span.textContent = "Send message";
    			t8 = space();
    			img = element("img");
    			add_location(h4, file$2, 5, 20, 236);
    			add_location(h2, file$2, 6, 20, 276);
    			attr_dev(div0, "class", "section-header section-header--center section-header--medium-margin");
    			add_location(div0, file$2, 4, 16, 134);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "name", "Name");
    			attr_dev(input0, "class", "form__input");
    			attr_dev(input0, "placeholder", "Name");
    			add_location(input0, file$2, 9, 20, 419);
    			attr_dev(input1, "type", "email");
    			attr_dev(input1, "name", "Email");
    			attr_dev(input1, "class", "form__input");
    			attr_dev(input1, "placeholder", "Email");
    			add_location(input1, file$2, 10, 20, 510);
    			attr_dev(textarea, "name", "Message");
    			attr_dev(textarea, "class", "form__textarea");
    			attr_dev(textarea, "placeholder", "Message");
    			add_location(textarea, file$2, 11, 20, 604);
    			add_location(span, file$2, 12, 77, 763);
    			attr_dev(button, "class", "form__btn btn btn--uppercase btn--orange");
    			add_location(button, file$2, 12, 20, 706);
    			attr_dev(form, "action", "#");
    			attr_dev(form, "class", "form contact-form");
    			attr_dev(form, "id", "contact-form");
    			add_location(form, file$2, 8, 16, 337);
    			attr_dev(div1, "class", "col");
    			add_location(div1, file$2, 3, 12, 100);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$2, 2, 8, 70);
    			attr_dev(div3, "class", "container");
    			add_location(div3, file$2, 1, 4, 38);
    			if (!src_url_equal(img.src, img_src_value = "img/subscribe-bg.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "contact-bg");
    			attr_dev(img, "alt", "");
    			add_location(img, file$2, 17, 4, 871);
    			attr_dev(section, "class", "section contact");
    			add_location(section, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h4);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			append_dev(div1, t3);
    			append_dev(div1, form);
    			append_dev(form, input0);
    			append_dev(form, t4);
    			append_dev(form, input1);
    			append_dev(form, t5);
    			append_dev(form, textarea);
    			append_dev(form, t6);
    			append_dev(form, button);
    			append_dev(button, span);
    			append_dev(section, t8);
    			append_dev(section, img);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Contact', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Contact> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Contact extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/inc/footer.svelte generated by Svelte v3.44.0 */

    const file$1 = "src/inc/footer.svelte";

    function create_fragment$1(ctx) {
    	let footer;
    	let div10;
    	let div9;
    	let div2;
    	let a0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div0;
    	let t2;
    	let div1;
    	let t4;
    	let div5;
    	let div4;
    	let div3;
    	let t6;
    	let ul;
    	let li0;
    	let a1;
    	let i0;
    	let t8;
    	let li1;
    	let a2;
    	let i1;
    	let t10;
    	let li2;
    	let a3;
    	let i2;
    	let t12;
    	let li3;
    	let a4;
    	let i3;
    	let t14;
    	let li4;
    	let a5;
    	let i4;
    	let t16;
    	let div8;
    	let form;
    	let div6;
    	let t18;
    	let div7;
    	let input;
    	let t19;
    	let button;
    	let span;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div10 = element("div");
    			div9 = element("div");
    			div2 = element("div");
    			a0 = element("a");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			div0.textContent = "Cryptoland";
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "© 2018, Cryptoland";
    			t4 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div3.textContent = "Stay connected:";
    			t6 = space();
    			ul = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			i0 = element("i");
    			i0.textContent = "";
    			t8 = space();
    			li1 = element("li");
    			a2 = element("a");
    			i1 = element("i");
    			i1.textContent = "";
    			t10 = space();
    			li2 = element("li");
    			a3 = element("a");
    			i2 = element("i");
    			i2.textContent = "";
    			t12 = space();
    			li3 = element("li");
    			a4 = element("a");
    			i3 = element("i");
    			i3.textContent = "";
    			t14 = space();
    			li4 = element("li");
    			a5 = element("a");
    			i4 = element("i");
    			i4.textContent = "";
    			t16 = space();
    			div8 = element("div");
    			form = element("form");
    			div6 = element("div");
    			div6.textContent = "Subscribe";
    			t18 = space();
    			div7 = element("div");
    			input = element("input");
    			t19 = space();
    			button = element("button");
    			span = element("span");
    			span.textContent = "Send";
    			attr_dev(img, "class", "logo__img logo__img--big");
    			if (!src_url_equal(img.src, img_src_value = "img/Logo_white.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$1, 5, 20, 175);
    			attr_dev(div0, "class", "logo__title");
    			add_location(div0, file$1, 6, 20, 266);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "logo");
    			add_location(a0, file$1, 4, 16, 129);
    			attr_dev(div1, "class", "copyright");
    			add_location(div1, file$1, 8, 16, 345);
    			attr_dev(div2, "class", "col-lg-4");
    			add_location(div2, file$1, 3, 12, 90);
    			attr_dev(div3, "class", "social-block__title");
    			add_location(div3, file$1, 12, 20, 511);
    			attr_dev(i0, "class", "fontello-icon icon-twitter");
    			add_location(i0, file$1, 20, 32, 813);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "social-list__link");
    			add_location(a1, file$1, 19, 28, 742);
    			attr_dev(li0, "class", "social-list__item");
    			add_location(li0, file$1, 17, 24, 682);
    			attr_dev(i1, "class", "fontello-icon icon-facebook");
    			add_location(i1, file$1, 25, 32, 1081);
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "class", "social-list__link");
    			add_location(a2, file$1, 24, 28, 1010);
    			attr_dev(li1, "class", "social-list__item");
    			add_location(li1, file$1, 23, 24, 951);
    			attr_dev(i2, "class", "fontello-icon icon-telegram");
    			add_location(i2, file$1, 30, 32, 1350);
    			attr_dev(a3, "href", "#");
    			attr_dev(a3, "class", "social-list__link");
    			add_location(a3, file$1, 29, 28, 1279);
    			attr_dev(li2, "class", "social-list__item");
    			add_location(li2, file$1, 28, 24, 1220);
    			attr_dev(i3, "class", "fontello-icon icon-bitcoin");
    			add_location(i3, file$1, 35, 32, 1619);
    			attr_dev(a4, "href", "#");
    			attr_dev(a4, "class", "social-list__link");
    			add_location(a4, file$1, 34, 28, 1548);
    			attr_dev(li3, "class", "social-list__item");
    			add_location(li3, file$1, 33, 24, 1489);
    			attr_dev(i4, "class", "fontello-icon icon-youtube-play");
    			add_location(i4, file$1, 40, 32, 1887);
    			attr_dev(a5, "href", "#");
    			attr_dev(a5, "class", "social-list__link");
    			add_location(a5, file$1, 39, 28, 1816);
    			attr_dev(li4, "class", "social-list__item");
    			add_location(li4, file$1, 38, 24, 1757);
    			attr_dev(ul, "class", "social-list");
    			add_location(ul, file$1, 16, 20, 633);
    			attr_dev(div4, "class", "social-block");
    			add_location(div4, file$1, 11, 16, 464);
    			attr_dev(div5, "class", "col-lg-4");
    			add_location(div5, file$1, 10, 12, 425);
    			attr_dev(div6, "class", "form__title");
    			add_location(div6, file$1, 48, 20, 2206);
    			attr_dev(input, "type", "email");
    			attr_dev(input, "name", "subscribe_email");
    			attr_dev(input, "class", "form__input");
    			attr_dev(input, "placeholder", "Email");
    			add_location(input, file$1, 50, 24, 2315);
    			add_location(span, file$1, 51, 92, 2491);
    			attr_dev(button, "class", "form__btn btn btn--uppercase btn--orange btn--small");
    			add_location(button, file$1, 51, 24, 2423);
    			attr_dev(div7, "class", "form__row");
    			add_location(div7, file$1, 49, 20, 2267);
    			attr_dev(form, "action", "#");
    			attr_dev(form, "class", "form subscribe");
    			attr_dev(form, "id", "subscribe-form");
    			add_location(form, file$1, 47, 16, 2125);
    			attr_dev(div8, "class", "col-lg-4");
    			add_location(div8, file$1, 46, 12, 2086);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file$1, 2, 8, 60);
    			attr_dev(div10, "class", "container");
    			add_location(div10, file$1, 1, 4, 28);
    			attr_dev(footer, "class", "footer");
    			add_location(footer, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div2);
    			append_dev(div2, a0);
    			append_dev(a0, img);
    			append_dev(a0, t0);
    			append_dev(a0, div0);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div9, t4);
    			append_dev(div9, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div4, t6);
    			append_dev(div4, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a1);
    			append_dev(a1, i0);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(li1, a2);
    			append_dev(a2, i1);
    			append_dev(ul, t10);
    			append_dev(ul, li2);
    			append_dev(li2, a3);
    			append_dev(a3, i2);
    			append_dev(ul, t12);
    			append_dev(ul, li3);
    			append_dev(li3, a4);
    			append_dev(a4, i3);
    			append_dev(ul, t14);
    			append_dev(ul, li4);
    			append_dev(li4, a5);
    			append_dev(a5, i4);
    			append_dev(div9, t16);
    			append_dev(div9, div8);
    			append_dev(div8, form);
    			append_dev(form, div6);
    			append_dev(form, t18);
    			append_dev(form, div7);
    			append_dev(div7, input);
    			append_dev(div7, t19);
    			append_dev(div7, button);
    			append_dev(button, span);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Footer', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.44.0 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let div;
    	let header;
    	let t0;
    	let promo;
    	let t1;
    	let economy;
    	let t2;
    	let about;
    	let t3;
    	let services;
    	let t4;
    	let roadmap;
    	let t5;
    	let feature;
    	let t6;
    	let usercase;
    	let t7;
    	let stat;
    	let t8;
    	let fact;
    	let t9;
    	let token;
    	let t10;
    	let docs;
    	let t11;
    	let datas;
    	let t12;
    	let faq;
    	let t13;
    	let advisors;
    	let t14;
    	let team;
    	let t15;
    	let news;
    	let t16;
    	let press;
    	let t17;
    	let partners;
    	let t18;
    	let contact;
    	let t19;
    	let footer;
    	let current;
    	header = new Header({ $$inline: true });
    	promo = new Promo({ $$inline: true });
    	economy = new Economy({ $$inline: true });
    	about = new About({ $$inline: true });
    	services = new Services({ $$inline: true });
    	roadmap = new Roadmap({ $$inline: true });
    	feature = new Feature({ $$inline: true });
    	usercase = new Usecase({ $$inline: true });
    	stat = new Stat({ $$inline: true });
    	fact = new Fact({ $$inline: true });
    	token = new Token({ $$inline: true });
    	docs = new Docs({ $$inline: true });
    	datas = new Data({ $$inline: true });
    	faq = new Faq({ $$inline: true });
    	advisors = new Advisors({ $$inline: true });
    	team = new Team({ $$inline: true });
    	news = new News({ $$inline: true });
    	press = new Press({ $$inline: true });
    	partners = new Partner({ $$inline: true });
    	contact = new Contact({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			create_component(header.$$.fragment);
    			t0 = space();
    			create_component(promo.$$.fragment);
    			t1 = space();
    			create_component(economy.$$.fragment);
    			t2 = space();
    			create_component(about.$$.fragment);
    			t3 = space();
    			create_component(services.$$.fragment);
    			t4 = space();
    			create_component(roadmap.$$.fragment);
    			t5 = space();
    			create_component(feature.$$.fragment);
    			t6 = space();
    			create_component(usercase.$$.fragment);
    			t7 = space();
    			create_component(stat.$$.fragment);
    			t8 = space();
    			create_component(fact.$$.fragment);
    			t9 = space();
    			create_component(token.$$.fragment);
    			t10 = space();
    			create_component(docs.$$.fragment);
    			t11 = space();
    			create_component(datas.$$.fragment);
    			t12 = space();
    			create_component(faq.$$.fragment);
    			t13 = space();
    			create_component(advisors.$$.fragment);
    			t14 = space();
    			create_component(team.$$.fragment);
    			t15 = space();
    			create_component(news.$$.fragment);
    			t16 = space();
    			create_component(press.$$.fragment);
    			t17 = space();
    			create_component(partners.$$.fragment);
    			t18 = space();
    			create_component(contact.$$.fragment);
    			t19 = space();
    			create_component(footer.$$.fragment);
    			attr_dev(div, "class", "wrapper");
    			add_location(div, file, 29, 5, 966);
    			add_location(main, file, 28, 0, 954);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			mount_component(header, div, null);
    			append_dev(div, t0);
    			mount_component(promo, div, null);
    			append_dev(div, t1);
    			mount_component(economy, div, null);
    			append_dev(div, t2);
    			mount_component(about, div, null);
    			append_dev(div, t3);
    			mount_component(services, div, null);
    			append_dev(div, t4);
    			mount_component(roadmap, div, null);
    			append_dev(div, t5);
    			mount_component(feature, div, null);
    			append_dev(div, t6);
    			mount_component(usercase, div, null);
    			append_dev(div, t7);
    			mount_component(stat, div, null);
    			append_dev(div, t8);
    			mount_component(fact, div, null);
    			append_dev(div, t9);
    			mount_component(token, div, null);
    			append_dev(div, t10);
    			mount_component(docs, div, null);
    			append_dev(div, t11);
    			mount_component(datas, div, null);
    			append_dev(div, t12);
    			mount_component(faq, div, null);
    			append_dev(div, t13);
    			mount_component(advisors, div, null);
    			append_dev(div, t14);
    			mount_component(team, div, null);
    			append_dev(div, t15);
    			mount_component(news, div, null);
    			append_dev(div, t16);
    			mount_component(press, div, null);
    			append_dev(div, t17);
    			mount_component(partners, div, null);
    			append_dev(div, t18);
    			mount_component(contact, div, null);
    			append_dev(div, t19);
    			mount_component(footer, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(promo.$$.fragment, local);
    			transition_in(economy.$$.fragment, local);
    			transition_in(about.$$.fragment, local);
    			transition_in(services.$$.fragment, local);
    			transition_in(roadmap.$$.fragment, local);
    			transition_in(feature.$$.fragment, local);
    			transition_in(usercase.$$.fragment, local);
    			transition_in(stat.$$.fragment, local);
    			transition_in(fact.$$.fragment, local);
    			transition_in(token.$$.fragment, local);
    			transition_in(docs.$$.fragment, local);
    			transition_in(datas.$$.fragment, local);
    			transition_in(faq.$$.fragment, local);
    			transition_in(advisors.$$.fragment, local);
    			transition_in(team.$$.fragment, local);
    			transition_in(news.$$.fragment, local);
    			transition_in(press.$$.fragment, local);
    			transition_in(partners.$$.fragment, local);
    			transition_in(contact.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(promo.$$.fragment, local);
    			transition_out(economy.$$.fragment, local);
    			transition_out(about.$$.fragment, local);
    			transition_out(services.$$.fragment, local);
    			transition_out(roadmap.$$.fragment, local);
    			transition_out(feature.$$.fragment, local);
    			transition_out(usercase.$$.fragment, local);
    			transition_out(stat.$$.fragment, local);
    			transition_out(fact.$$.fragment, local);
    			transition_out(token.$$.fragment, local);
    			transition_out(docs.$$.fragment, local);
    			transition_out(datas.$$.fragment, local);
    			transition_out(faq.$$.fragment, local);
    			transition_out(advisors.$$.fragment, local);
    			transition_out(team.$$.fragment, local);
    			transition_out(news.$$.fragment, local);
    			transition_out(press.$$.fragment, local);
    			transition_out(partners.$$.fragment, local);
    			transition_out(contact.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			destroy_component(promo);
    			destroy_component(economy);
    			destroy_component(about);
    			destroy_component(services);
    			destroy_component(roadmap);
    			destroy_component(feature);
    			destroy_component(usercase);
    			destroy_component(stat);
    			destroy_component(fact);
    			destroy_component(token);
    			destroy_component(docs);
    			destroy_component(datas);
    			destroy_component(faq);
    			destroy_component(advisors);
    			destroy_component(team);
    			destroy_component(news);
    			destroy_component(press);
    			destroy_component(partners);
    			destroy_component(contact);
    			destroy_component(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Header,
    		Promo,
    		Economy,
    		About,
    		Services,
    		RoadMap: Roadmap,
    		Feature,
    		UserCase: Usecase,
    		Stat,
    		Fact,
    		Token,
    		Docs,
    		Datas: Data,
    		Faq,
    		Advisors,
    		Team,
    		News,
    		Press,
    		Partners: Partner,
    		Contact,
    		Footer
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
