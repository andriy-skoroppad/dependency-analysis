const folderIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M10.59 4.59C10.21 4.21 9.7 4 9.17 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-1.41-1.41z"/></svg>`;
const fileIcon = `<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><g><rect fill="none" height="24" width="24"/><path d="M14.17,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V9.83c0-0.53-0.21-1.04-0.59-1.41l-4.83-4.83 C15.21,3.21,14.7,3,14.17,3L14.17,3z M8,15h8c0.55,0,1,0.45,1,1v0c0,0.55-0.45,1-1,1H8c-0.55,0-1-0.45-1-1v0C7,15.45,7.45,15,8,15z M8,11h8c0.55,0,1,0.45,1,1v0c0,0.55-0.45,1-1,1H8c-0.55,0-1-0.45-1-1v0C7,11.45,7.45,11,8,11z M8,7h5c0.55,0,1,0.45,1,1v0 c0,0.55-0.45,1-1,1H8C7.45,9,7,8.55,7,8v0C7,7.45,7.45,7,8,7z"/></g></svg>`;
Vue.component('folder-icon', {
    template: folderIcon,
});
Vue.component('file-icon', {
    template: fileIcon,
});

/**
 * <file-item
    v-bind:path="path"
    v-on:get-file="postFontSize += $event"
    v-on:get-file-deps="postFontSize += $event"
    ></file-item>
 * 
 */
Vue.component('file-item', {
    data: function() {
        return {
            depLevel: 2
        };
    },
    props: ['path'],
    template: `
    <div class="fs-element">
        <span>
          <span class="align-middle">
            <file-icon></file-icon>
          </span>
          <code class="align-middle">{{path}}</code>
        </span>
        <button class="btn btn-default" v-on:click="$emit('get-file', path)">Show</button>
        <button class="btn btn-default" v-on:click="$emit('get-file-deps', {path, depLevel})">Deps</button>
        <input style="width: 40px" type="number" v-model="depLevel" class="depLevel" />
      </div>
    `,
});

Vue.component('accordion', {
    data: function() {
        return {
            opened: false
        };
    },
    template: `
    <div class="base-block">
        <slot name="header"></slot>
        <button class="btn btn-default" v-on:click="opened = !opened">
            Toggle <slot name="number"></slot> elements visibility
        </button>
        <div v-if="opened" class="dep-block">
            <slot></slot>
        </div>
    </div>
    `,
});