/**
 * relation-picker - Relation type selector grid
 *
 * Renders a 2x5 grid of relation type buttons and highlights the
 * currently selected relation. Emits a 'select' event on tap.
 */
var constants = require('../../utils/constants')
var RELATION_TYPE_LABELS = constants.RELATION_TYPE_LABELS

Component({
  properties: {
    selected: { type: String, value: '' },
    gender: { type: String, value: '' }
  },

  data: {
    relations: []
  },

  lifetimes: {
    attached: function () {
      this.buildRelations()
    }
  },

  observers: {
    'gender': function () {
      this.buildRelations()
    }
  },

  methods: {
    /**
     * Build the list of relations, optionally filtering by the target
     * person's gender to show only applicable relation types.
     */
    buildRelations: function () {
      var gender = this.data.gender
      var all = Object.keys(RELATION_TYPE_LABELS).map(function (key) {
        return { key: key, label: RELATION_TYPE_LABELS[key] }
      })

      if (!gender) {
        this.setData({ relations: all })
        return
      }

      // Filter relations by the subject person's gender.
      // If the new person is male, only show male-applicable relation types.
      // If the new person is female, only show female-applicable relation types.
      var maleTypes = ['FATHER', 'SON', 'HUSBAND', 'OLDER_BROTHER', 'YOUNGER_BROTHER']
      var femaleTypes = ['MOTHER', 'DAUGHTER', 'WIFE', 'OLDER_SISTER', 'YOUNGER_SISTER']
      var allowed = gender === 'male' ? maleTypes : femaleTypes
      var filtered = all.filter(function (item) {
        return allowed.indexOf(item.key) !== -1
      })
      this.setData({ relations: filtered })
    },

    onSelect: function (e) {
      var type = e.currentTarget.dataset.type
      this.triggerEvent('select', { type: type })
    }
  }
})
