// adapted from vuejs-smart-table
// TODO: try to be able to use the basic and the custom filter at the same time (currently simply with the same filterValue)
// anattempt to modify it to work without the store, since it causes troubles. INstead, I will try to access the parent via $parent and include the store in the 

// SmartPagination component
let SmartPagination = {
  name: 'SmartPagination',
  template:`
  <nav v-show="!(hideSinglePage && totalPages === 1)" class="smart-pagination">
    <ul class="pagination">
      <li :class="{'disabled': currentPage === 1}" v-if="boundaryLinks" class="page-item">
        <a href="javascript:void(0)" aria-label="Previous" @click="firstPage" class="page-link">
          <span aria-hidden="true" v-html="firstText"></span>
        </a>
      </li>

      <li :class="{'disabled': currentPage === 1}" v-if="directionLinks" class="page-item">
        <a href="javascript:void(0)" aria-label="Previous" @click="previousPage()" class="page-link">
          <slot name="previousIcon" :disabled="currentPage === 1">
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
              <path fill="currentColor"
                    d="M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z"></path>
            </svg>
          </slot>
        </a>
      </li>

      <li
        v-for="page in displayPages"
        :key="page.value"
        class="page-item"
        :class="{'active': currentPage === page.value}"
      >
        <a href="javascript:void(0)" @click="selectPage(page.value)" class="page-link">{{page.title}}</a>
      </li>

      <li :class="{'disabled': currentPage === totalPages}" v-if="directionLinks"
          class="page-item">
        <a href="javascript:void(0)" aria-label="Next" @click="nextPage()" class="page-link">
          <slot name="nextIcon" :disabled="currentPage === totalPages">
            <svg width="16" height="16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
              <path fill="currentColor"
                    d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z"></path>
            </svg>
          </slot>
        </a>
      </li>

      <li :class="{'disabled': currentPage === totalPages}" v-if="boundaryLinks"
          class="page-item">
        <a href="javascript:void(0)" aria-label="Previous" @click="lastPage()" class="page-link">
          <span aria-hidden="true" v-html="lastText"></span>
        </a>
      </li>
    </ul>
  </nav>
  `,
  props: {
    currentPage: {
      required: true,
      type: Number
    },
    totalPages: {
      required: true,
      type: Number
    },
    hideSinglePage: {
      required: false,
      type: Boolean,
      default: true
    },
    maxPageLinks: {
      required: false,
      type: Number
    },
    boundaryLinks: {
      required: false,
      type: Boolean,
      default: false
    },
    firstText: {
      required: false,
      type: String,
      default: 'First'
    },
    lastText: {
      required: false,
      type: String,
      default: 'Last'
    },
    directionLinks: {
      required: false,
      type: Boolean,
      default: true
    }
  },
  computed: {
    displayPages () {
      if (isNaN(this.maxPageLinks) || this.maxPageLinks <= 0) {
        return this.displayAllPages()
      } else {
        return this.limitVisiblePages()
      }
    }
  },
  methods: {
    displayAllPages () {
      const displayPages = []

      for (let i = 1; i <= this.totalPages; i++) {
        displayPages.push({
          title: i.toString(),
          value: i
        })
      }
      return displayPages
    },
    limitVisiblePages () {
      const displayPages = []

      const totalTiers = Math.ceil(this.totalPages / this.maxPageLinks)

      const activeTier = Math.ceil(this.currentPage / this.maxPageLinks)

      const start = ((activeTier - 1) * this.maxPageLinks) + 1
      const end = start + this.maxPageLinks

      if (activeTier > 1) {
        displayPages.push({
          title: '...',
          value: start - 1
        })
      }

      for (let i = start; i < end; i++) {
        if (i > this.totalPages) {
          break
        }

        displayPages.push({
          title: i.toString(),
          value: i
        })
      }

      if (activeTier < totalTiers) {
        displayPages.push({
          title: '...',
          value: end
        })
      }

      return displayPages
    },
    selectPage (page) {
      if (page < 1 || page > this.totalPages || page === this.currentPage) {
        return
      }

      this.$emit('update:currentPage', page)
    },
    nextPage () {
      if (this.currentPage < this.totalPages) {
        this.$emit('update:currentPage', this.currentPage + 1)
      }
    },
    previousPage () {
      if (this.currentPage > 1) {
        this.$emit('update:currentPage', this.currentPage - 1)
      }
    },
    firstPage () {
      this.$emit('update:currentPage', 1)
    },
    lastPage () {
      this.$emit('update:currentPage', this.totalPages)
    }
  }

  // continue copying props
}


// VTh component
let VTh = {
    name: 'v-th',
    template:`
    <th @click="sort" :class="sortClass" :aria-sort="ariaSortLabel">
    <template v-if="!state.hideSortIcons">
      <slot name="descIcon" v-if="order === -1">
        <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
          <path fill="currentColor" d="M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6 9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41z"/>
        </svg>
      </slot>
      <slot name="sortIcon" v-else-if="order === 0">
        <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
          <path fill="currentColor" d="M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6 9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41zm255-105L177 64c-9.4-9.4-24.6-9.4-33.9 0L24 183c-15.1 15.1-4.4 41 17 41h238c21.4 0 32.1-25.9 17-41z"/></svg>
      </slot>
      <slot name="ascIcon" v-else-if="order === 1">
        <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
          <path fill="currentColor" d="M279 224H41c-21.4 0-32.1-25.9-17-41L143 64c9.4-9.4 24.6-9.4 33.9 0l119 119c15.2 15.1 4.5 41-16.9 41z"/>
        </svg>
      </slot>
    </template>
    <slot></slot>
  </th>
    `,
    templateSimple:`
    <th @click="sort" :class="sortClass" :aria-sort="ariaSortLabel">
    <slot></slot>
  </th>
    `,
    props: { // props must be all lowercase!
        sortkey: {
          required: false,
          type: [Function, String]
        },
        customsort: {
          required: false,
          type: Function
        },
        defaultsort: {
          required: false,
          type: String,
          validator: value => ['asc', 'desc'].includes(value)
        }
      },
      inject: ['store'],
      data () {
        return {
          id: uuid(),
          order: 0,
          orderClasses: ['vt-desc', 'vt-sortable', 'vt-asc'],
          ariaLabels: ['descending', 'none', 'ascending'],
          state: this.store,//._data
        }
      },
      computed: {
        sortEnabled () {
          return this.sortkey || typeof this.customsort === 'function'
        },
        sortId () {
          return this.state.sortId
        },
        sortClass () {
          return this.state.hideSortIcons ? [this.orderClasses[this.order + 1], 'vt-sort'] : []
        },
        ariaSortLabel () {
          return this.ariaLabels[this.order + 1]
        }
      },
      watch: {
        sortId (sortId) {
          if (sortId !== this.id && this.order !== 0) {
            this.order = 0
          }
        }
      },
      mounted () {
        if (!this.sortkey && !this.customsort) {
          throw new Error('Must provide the Sort Key value or a Custom Sort function.')
        }
    
        if (this.defaultsort) {
          this.order = this.defaultsort === 'desc' ? -1 : 1
          this.$parent.setSort({
            sortOrder: this.order,
            sortkey: this.sortkey,
            customsort: this.customsort,
            sortId: this.id
          })
          this.$nextTick(() => {
            this.$emit('defaultsort')
          })
        }
      },
      methods: {
        sort: function () {
          if (this.sortEnabled) {
            this.order = this.order === 0 || this.order === -1 ? this.order + 1 : -1
            this.$parent.setSort({
              sortOrder: this.order,
              sortkey: this.sortkey,
              customsort: this.customsort,
              sortId: this.id
            })
          }
        }
      }
}

//VTr component
let VTr = {
    name: 'v-tr',
    template:`
    <tr
    :class="[rowClass]"
    :style="style"
    @click="handleRowSelected"

  >
    <slot></slot>
  </tr>`,
  props: {
    row: {
      required: true
    }
  },
  inject: ['store'],
  data () {
    return {
      state: this.store,//._data
    }
  },
  mounted () {
    if (!this.state.customSelection) {
      this.$el.style.cursor = 'pointer'
    }
  },
  beforeDestroy () {
    if (!this.state.customSelection) {
      this.$el.removeEventListener('click', this.handleRowSelected)
    }
  },
  computed: {
    isSelected () {
      return this.state.selectedRows.find(it => it === this.row)
    },
    rowClass: function () {
      return this.isSelected ? this.state.selectedClass : ''
    },
    style () {
      return {
        ...(!this.state.customSelection ? { cursor: 'pointer' } : {})
      }
    }
  },
  methods: {
    handleRowSelected (event) {
      if (this.state.customSelection) return

      let source = event.target || event.srcElement
      if (source.tagName.toLowerCase() === 'td') {
        if (this.isSelected) {
          this.store.deselectRow(this.row)
        } else {
          this.store.selectRow(this.row)
        }
      }
    }
  }
}

// VTable component
let VTable = {
    name: 'SmartTable',
    template:`
    <table>
    <slot name="head"></slot>
    <slot name="body" v-bind:displayData="displayData"></slot>
  </table>`,
  props: {
    data: {
      required: true,
      type: Array
    },
    filters: {
      required: false,
      type: Object
    },
    currentPage: {
      required: false,
      type: Number
    },
    pageSize: {
      required: false,
      type: Number
    },
    allowSelection: {
      required: false,
      type: Boolean,
      default: false
    },
    selectionMode: {
      required: false,
      type: String,
      default: 'single'
    },
    selectedClass: {
      required: false,
      type: String,
      default: 'vt-selected'
    },
    customSelection: {
      required: false,
      type: Boolean
    },
    hideSortIcons: {
      required: false,
      type: Boolean
    },
    g:{
      required:false,
      type:Object
    }
  },
  beforeCreate () {
      // the store is an actual Vue instance
    //this.store = Vue.createApp(store);
  },
  provide () {
    return {
      store: this.state
    }
  },
  data () {
    return {
      //state: this.store,//._data,
      state: {
        selectedRows: [],
        selectionMode: 'single',
        customSelection: null,
        selectedClass: null,
        hideSortIcons: null,
        sortId: null,
        sortkey: null,
        customsort: null,
        sortOrder: null
      },
      initialLoad: false,
    }
  },
  computed: {
    needsPaginationReset () {
      return this.currentPage > this.totalPages
    },
    filteredData () {
      if (this.data.length === 0) {
        return []
      }

      if (typeof this.filters !== 'object') {
        return this.data
      }

      return doFilter(this.data, this.filters)
    },
    totalItems () {
      return this.filteredData.length
    },
    sortedData () {
      if ((this.state.sortkey || this.state.customsort) && this.state.sortOrder !== 0) {
        return doSort(this.filteredData, this.state.sortkey, this.state.customsort, this.state.sortOrder)
      }

      return this.filteredData
    },
    totalPages () {
      if (!this.pageSize) return 0

      return calculateTotalPages(this.totalItems, this.pageSize)
    },
    displayData () {
      if (this.pageSize) {
        return doPaginate(this.sortedData, this.pageSize, this.currentPage)
      }

      return this.sortedData
    },
    selectedRows () {
      return this.state.selectedRows
    }
  },
  watch: {
    displayData: {
      handler () {
        if (!this.initialLoad) {
          this.initialLoad = true
          this.$emit('loaded', this)
        }
      },
      immediate: true
    },
    selectionMode: {
      handler (mode) {
        this.state.selectionMode = mode
      },
      immediate: true
    },
    selectedClass: {
      handler (selectedClass) {
        this.state.selectedClass = selectedClass
      },
      immediate: true
    },
    customSelection: {
      handler (customSelection) {
        this.state.customSelection = customSelection
      },
      immediate: true
    },
    hideSortIcons: {
      handler (hideSortIcons) {
        this.state.hideSortIcons = hideSortIcons
      },
      immediate: true
    },
    needsPaginationReset: {
      handler (needsReset) {
        if (needsReset) {
          this.$emit('update:currentPage', 1)
        }
      },
      immediate: true
    },
    totalPages: {
      handler (totalPages) {
        this.$emit('totalPagesChanged', totalPages)
      },
      immediate: true
    },
    totalItems: {
      handler (totalItems) {
        this.$emit('totalItemsChanged', totalItems)
      },
      immediate: true
    },
    selectedRows: {
      handler (selected) {
        this.$emit('selectionChanged', selected)
      },
      immediate: true
    }
  },
  methods: {
    revealItem (item) {
      if (!this.pageSize) {
        return true
      }

      let index
      if (typeof item === 'function') {
        index = this.sortedData.findIndex(item)
      } else {
        index = this.sortedData.indexOf(item)
      }

      if (index === -1) {
        return false
      }

      const currentPage = Math.ceil((index + 1) / this.pageSize)
      this.$emit('update:currentPage', currentPage)

      return true
    },
    revealPage (page) {
      if (!this.pageSize || Number.isNaN(page) || page < 1) {
        return
      }

      this.$emit('update:currentPage', page)
    },
    /*selectRow (row) {
      this.store.selectRow(row)
    },
    selectRows (rows) {
      this.store.selectRows(rows)
    },
    deselectRow (row) {
      this.store.deselectRow(row)
    },
    deselectRows (rows) {
      this.store.deselectRows(rows)
    },
    selectAll () {
      if (this.selectionMode === 'single') return

      this.store.selectAll([...this.data])
    },
    deselectAll () {
      this.store.deselectAll()
    },*/
    selectRow (row) {
        if (this.selectionMode === 'single') {
          this.state.selectedRows = [row]
          return
        }
  
        const index = this.selectedRows.indexOf(row)
        if (index === -1) {
          this.state.selectedRows.push(row)
        }
      },
      selectRows (rows) {
        for (let row of rows) {
          this.selectRow(row)
        }
      },
      deselectRow (row) {
        const index = this.state.selectedRows.indexOf(row)
  
        if (index > -1) {
          this.state.selectedRows.splice(index, 1)
        }
      },
      deselectRows (rows) {
        for (let row of rows) {
          this.deselectRow(row)
        }
      },
      //selectAll (all) {
      selectAll () {
        if (this.selectionMode === 'single') return

        this.state.selectAll([...this.data])
        //this.state.selectedRows = all
      },
      deselectAll () {
        this.state.selectedRows = []
      },
      setSort ({ sortkey, customsort, sortOrder, sortId }) {
        this.state.sortkey = sortkey
        this.state.customsort = customsort
        this.state.sortOrder = sortOrder
        this.state.sortId = sortId
      }
  }
} // end VTable

// copied from store.js
let store = {
    data: () => ({
      selectedRows: [],
      selectionMode: 'single',
      customSelection: null,
      selectedClass: null,
      hideSortIcons: null,
      sortId: null,
      sortkey: null,
      customsort: null,
      sortOrder: null
    }),
    methods: {
      selectRow (row) {
        if (this.selectionMode === 'single') {
          this.selectedRows = [row]
          return
        }
  
        const index = this.selectedRows.indexOf(row)
        if (index === -1) {
          this.selectedRows.push(row)
        }
      },
      selectRows (rows) {
        for (let row of rows) {
          this.selectRow(row)
        }
      },
      deselectRow (row) {
        const index = this.selectedRows.indexOf(row)
  
        if (index > -1) {
          this.selectedRows.splice(index, 1)
        }
      },
      deselectRows (rows) {
        for (let row of rows) {
          this.deselectRow(row)
        }
      },
      selectAll (all) {
        this.selectedRows = all
      },
      deselectAll () {
        this.selectedRows = []
      },
      setSort ({ sortkey, customsort, sortOrder, sortId }) {
        this.sortkey = sortkey
        this.customsort = customsort
        this.sortOrder = sortOrder
        this.sortId = sortId
      }
    },
    components:{
        // instead of globally adding it with vueAthletes.component(...), we can also do that locally
        'v-table':VTable,
        'v-th': VTh,
        'v-tr':VTr,
    }
  }


// copied from table-utils.js
 function doSort (toSort, sortkey, customsort, sortOrder) {
    let local = [...toSort]
  
    return local.sort((a, b) => {
      if (typeof customsort === 'function') {
        return customsort(a, b) * sortOrder
      }
  
      let val1
      let val2
  
      if (typeof sortkey === 'function') {
        val1 = sortkey(a, sortOrder)
        val2 = sortkey(b, sortOrder)
      } else {
        val1 = getPropertyValue(a, sortkey)
        val2 = getPropertyValue(b, sortkey)
      }
  
      if (val1 === null || val1 === undefined) val1 = ''
      if (val2 === null || val2 === undefined) val2 = ''
  
      if (isNumeric(val1) && isNumeric(val2)) {
        return (val1 - val2) * sortOrder
      }
  
      const str1 = val1.toString()
      const str2 = val2.toString()
  
      return str1.localeCompare(str2) * sortOrder
    })
  }
  
 function doFilter (toFilter, filters) {
    let filteredData = []
  
    for (let item of toFilter) {
      let passed = true
  
      for (let filterName in filters) {
        if (!filters.hasOwnProperty(filterName)) {
          continue
        }
  
        let filter = filters[filterName]
  
        if (!passFilter(item, filter)) {
          passed = false
          break
        }
      }
  
      if (passed) {
        filteredData.push(item)
      }
    }
  
    return filteredData
  }
  
 function doPaginate (toPaginate, pageSize, currentPage) {
    if (toPaginate.length <= pageSize || pageSize <= 0 || currentPage <= 0) {
      return toPaginate
    }
  
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
  
    return [...toPaginate].slice(start, end)
  }
  
 function calculateTotalPages (totalItems, pageSize) {
    return totalItems <= pageSize ? 1 : Math.ceil(totalItems / pageSize)
  }
  
 function passFilter (item, filter) {
   // OLD: if there is a custom filter, only evaluate this
    // new: if there are both, a custom filter and general keys, try to find a match in both
    if (typeof filter.custom === 'function') {
      if (filter.custom(filter.value, item)){
        return true;
      }
        //return filter.custom(filter.value, item);
    }
    
    if (!Array.isArray(filter.keys)){
      // typically the case when we have just a custom filter, which was false
      return false;
    }

    if (filter.value === null || filter.value === undefined || filter.value.length === 0) {
      return true
    }
  
    for (let key of filter.keys) {
      const value = getPropertyValue(item, key)
  
      if (value !== null && value !== undefined) {
        const filterStrings = Array.isArray(filter.value) ? filter.value : [filter.value]
  
        for (const filterString of filterStrings) {
          if (filter.exact) {
            if (value.toString() === filterString.toString()) {
              return true
            }
          } else {
            if (value.toString().toLowerCase().includes(filterString.toString().toLowerCase())) {
              return true
            }
          }
        }
      }
    }
    return false
  }
  
 function getPropertyValue (object, keyPath) {
    keyPath = keyPath.replace(/\[(\w+)\]/g, '.$1')
    keyPath = keyPath.replace(/^\./, '')
    const a = keyPath.split('.')
    for (let i = 0, n = a.length; i < n; ++i) {
      let k = a[i]
      if (k in object) {
        object = object[k]
      } else {
        return
      }
    }
    return object
  }
  
  
 function isNumeric (toCheck) {
    return !Array.isArray(toCheck) && !isNaN(parseFloat(toCheck)) && isFinite(toCheck)
  }
  
  function uuid () {
    return '_' + Math.random().toString(36).substr(2, 9)
  }
  