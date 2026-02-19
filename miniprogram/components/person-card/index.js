/**
 * person-card - Person card component
 *
 * Displays a person's avatar (or initial letter with gender colour),
 * name, display title (customTitle > formalTitle > name),
 * gender tag, and an optional navigation arrow.
 */
Component({
  properties: {
    person: { type: Object, value: {} },
    customTitle: { type: String, value: '' },
    formalTitle: { type: String, value: '' },
    showArrow: { type: Boolean, value: true }
  },

  methods: {
    /**
     * Return the best available display title for this person.
     * Priority: customTitle > formalTitle > person.name
     */
    getDisplayTitle: function () {
      if (this.data.customTitle) return this.data.customTitle
      if (this.data.formalTitle) return this.data.formalTitle
      return this.data.person.name || ''
    },

    /**
     * Return the first character of the person's name for the avatar placeholder.
     */
    getInitial: function () {
      var name = this.data.person.name || ''
      return name.length > 0 ? name[0] : '?'
    },

    onTap: function () {
      this.triggerEvent('tap', { personId: this.data.person._id })
    }
  }
})
