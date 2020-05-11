(() => {
  const laxInstance = (() => {
    const transforms = ["perspective", "translateX", "translateY", "translate", "scaleX", "scaleY", "scale", "skewX", "skewY", "skew", "rotateX", "rotateY", "rotate"]
    const filters = ["blur", "hue-rotate", "brightness"]

    const pxUnits = ["perspective", "translateX", "translateY", "translate", "border-radius", "blur"]
    const degUnits = ["hue-rotate", "rotate", "rotateX", "rotateY", "skew", "skewX", "skewY"]

    function floatOrNull(v = "") {
      return v === "" ? undefined : v
    }

    function lerp(start, end, t) {
      return start * (1 - t) + end * t
    }

    function invlerp(a, b, v) {
      return (v - a) / (b - a)
    }

    function interpolate(arrA, arrB, v, easingFn) {
      let k = 0

      arrA.forEach((a) => {
        if (a < v) k++
      })

      if (k <= 0) {
        return arrB[0]
      }

      if (k >= arrA.length) {
        return arrB[arrA.length - 1]
      }

      const j = k - 1

      let vector = invlerp(arrA[j], arrA[k], v)
      if (easingFn) vector = easingFn(vector)
      const lerpVal = lerp(arrB[j], arrB[k], vector)
      return lerpVal
    }

    const easings = {
      easeInQuad: t => t * t,
      easeOutQuad: t => t * (2 - t),
      easeInOutQuad: t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      easeInCubic: t => t * t * t,
      easeOutCubic: t => (--t) * t * t + 1,
      easeInOutCubic: t => t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
      easeInQuart: t => t * t * t * t,
      easeOutQuart: t => 1 - (--t) * t * t * t,
      easeInOutQuart: t => t < .5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
      easeInQuint: t => t * t * t * t * t,
      easeOutQuint: t => 1 + (--t) * t * t * t * t,
      easeInOutQuint: t => t < .5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
      easeOutBounce: t => {
        const n1 = 7.5625;
        const d1 = 2.75;

        if (t < 1 / d1) {
          return n1 * t * t;
        } else if (t < 2 / d1) {
          return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
          return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
          return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
      },
      easeInBounce: t => {
        return 1 - easings.easeOutBounce(1 - t);
      },
      easeOutBack: t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;

        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      },
      easeInBack: t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;

        return c3 * t * t * t - c1 * t * t;
      },
    }

    function flattenStyles(styles) {
      const flattenedStyles = {
        transform: '',
        filter: ''
      }

      Object.keys(styles).forEach((key) => {
        const val = styles[key]

        const unit = pxUnits.includes(key) ? 'px' : (degUnits.includes(key) ? 'deg' : '')

        if (transforms.includes(key)) {
          flattenedStyles.transform += `${key}(${val}${unit}) `
        } else if (filters.includes(key)) {
          flattenedStyles.filter += `${key}(${val}${unit}) `
        } else {
          flattenedStyles[key] = `${val}${unit} `
        }
      })

      return flattenedStyles
    }

    function parseValue(val, { width, height, x, y }, index) {
      if (typeof val === 'number') {
        return val
      }

      const screenWidth = document.body.clientWidth
      const screenHeight = document.body.clientHeight
      const scrollTop = document.body.scrollTop
      const scrollLeft = document.body.scrollLeft

      const left = x + scrollLeft
      const right = left + width
      const top = y + scrollTop
      const bottom = top + height

      return Function(`return ${val
        .replace(/screenWidth/g, screenWidth)
        .replace(/screenHeight/g, screenHeight)
        .replace(/elWidth/g, width)
        .replace(/elHeight/g, height)
        .replace(/elInBottom/g, top - screenHeight)
        .replace(/elOutTop/g, bottom)
        .replace(/elCenterVert/g, top + (height / 2) - (screenHeight / 2))
        .replace(/elInRight/g, left - screenWidth)
        .replace(/elOutLeft/g, right)
        .replace(/elCenterHoriz/g, left + (width / 2) - (screenWidth / 2))
        .replace(/index/g, index)
        }`)()
    }

    class LaxDriver {
      getValueFn
      name = ''
      lastValue = 0
      frameStep = 1
      m1 = 0

      m2 = 0
      momentum = 0
      momentumEnabled = "off"


      constructor(name, getValueFn, options = {}) {
        this.name = name
        this.getValueFn = getValueFn

        Object.keys(options).forEach((key) => {
          this[key] = options[key]
        })

        this.lastValue = this.getValueFn()
      }

      getValue = (frame) => {
        let value = this.lastValue

        if (frame % this.frameStep === 0) {
          value = this.getValueFn()
        }

        if (this.momentumEnabled !== "off") {
          const delta = value - this.lastValue
          const damping = 0.8

          this.m1 = this.m1 * damping + delta * (1 - damping)
          this.m2 = this.m2 * damping + this.m1 * (1 - damping)
          this.momentum = Math.round(this.m2 * 5000) / 10000
          if (this.momentumEnabled === "absolute") {
            this.momentum = Math.abs(this.momentum)
          }
        }

        this.lastValue = value
        return [this.lastValue, this.momentum]
      }
    }

    class LaxElement {
      domElement
      animationsData
      styles = {}
      selector = ''

      groupIndex = 0
      laxInstance

      constructor(selector, laxInstance, domElement, animationData, groupIndex = 0, options = {}) {
        this.selector = selector
        this.laxInstance = laxInstance
        this.domElement = domElement
        this.animationsData = animationData
        this.groupIndex = groupIndex

        const { transition, willChange } = options

        if (transition) {
          domElement.style.transition = transition
        }

        if (willChange) {
          domElement.style.willChange = willChange
        }

        this.calculateAnimations()
      }

      update = (driverValues, frame) => {
        const { animations } = this

        const styles = {}

        for (let driverName in animations) {
          const styleBindings = animations[driverName]

          if (!driverValues[driverName]) {
            console.error("No lax driver with name: ", driverName)
          }

          const [value, momentumValue] = driverValues[driverName]

          for (let key in styleBindings) {
            const [arr1, arr2, options = {}] = styleBindings[key]
            const { loopFrame, frameStep = 1, easing, momentum, cssFn } = options

            const easingFn = easings[easing]

            if (frame % frameStep === 0) {
              const v = loopFrame ? value % loopFrame : value
              let interpolatedValue = interpolate(arr1, arr2, v, easingFn)

              if (momentum) interpolatedValue += (momentumValue * momentum)

              styles[key] = cssFn ? cssFn(interpolatedValue) : interpolatedValue
            }
          }
        }

        this.applyStyles(styles)
      }

      calculateAnimations = () => {
        this.animations = {}

        for (let driverName in this.animationsData) {
          let styleBindings = this.animationsData[driverName]

          const parsedStyleBindings = {}

          const { presets = [] } = styleBindings

          presets.forEach((presetString) => {
            const [presetName, opts = ''] = presetString.split(" ")
            const presetFn = this.laxInstance.presets[presetName]

            if (!presetFn) {
              console.error("Lax preset cannot be found with name: ", presetName)
            } else {
              const [v, speed, axis] = opts.split(',')
              const preset = presetFn(floatOrNull(v), floatOrNull(speed), axis)

              Object.keys(preset).forEach((key) => {
                styleBindings[key] = preset[key]
              })
            }
          })

          delete styleBindings.presets

          for (let key in styleBindings) {
            let [arr1, arr2, options = {}] = styleBindings[key]

            const bounds = this.domElement.getBoundingClientRect()
            const parsedArr1 = arr1.map(i => parseValue(i, bounds, this.groupIndex))
            const parsedArr2 = arr2.map(i => parseValue(i, bounds, this.groupIndex))

            parsedStyleBindings[key] = [parsedArr1, parsedArr2, options]
          }

          this.animations[driverName] = parsedStyleBindings
        }
      }

      applyStyles = (styles) => {
        const mergedStyles = flattenStyles(styles)

        Object.keys(mergedStyles).forEach((key) => {
          this.domElement.style[key] = mergedStyles[key]
        })
      }
    }

    class Lax {
      drivers = []
      elements = []
      frame = 0

      debug = false

      windowWidth = 0
      windowHeight = 0
      presets = {}

      debugData = {
        frameLengths: []
      }

      init = (presets = {}) => {
        this.addDriver('frame', () => {
          return this.frame
        })

        this.presets = presets

        this.findAndAddElements()

        window.requestAnimationFrame(this.onAnimationFrame)
        this.windowWidth = document.body.clientWidth
        this.windowHeight = document.body.clientHeight

        window.onresize = this.onWindowResize
      }

      onWindowResize = () => {
        const changed = document.body.clientWidth !== this.windowWidth ||
          document.body.clientHeight !== this.windowHeight

        if (changed) {
          this.windowWidth = document.body.clientWidth
          this.windowHeight = document.body.clientHeight
          this.elements.forEach(el => el.calculateAnimations())
        }
      }

      onAnimationFrame = (e) => {
        if (this.debug) {
          this.debugData.frameStart = Date.now()
        }

        const driverValues = {}

        this.drivers.forEach((driver) => {
          driverValues[driver.name] = driver.getValue(this.frame)
        })

        this.elements.forEach((element) => {
          element.update(driverValues, this.frame)
        })

        if (this.debug) {
          this.debugData.frameLengths.push(Date.now() - this.debugData.frameStart)
        }

        if (this.frame % 60 === 0 && this.debug) {
          const averageFrameTime = Math.ceil((this.debugData.frameLengths.reduce((a, b) => a + b, 0) / 60))
          console.log(`Average frame calculation time: ${averageFrameTime}ms`)
          this.debugData.frameLengths = []
        }

        this.frame++

        window.requestAnimationFrame(this.onAnimationFrame)
      }

      addDriver = (name, getValueFn, options = {}) => {
        this.drivers.push(
          new LaxDriver(name, getValueFn, options)
        )
      }

      removeDriver = (name) => {
        this.drivers = this.drivers.filter(driver => driver.name !== name)
      }

      findAndAddElements = () => {
        this.elements = []
        const elements = document.querySelectorAll("[data-lax]")

        elements.forEach((domElement) => {
          const animations = Function(`return ${domElement.getAttribute('data-lax')}`)()
          this.elements.push(new LaxElement('[data-lax]', this, domElement, animations, 0, {}))
        })
      }

      addElements = (selector, animations, options) => {
        const domElements = document.querySelectorAll(selector)

        domElements.forEach((domElement, i) => {
          this.elements.push(new LaxElement(selector, this, domElement, animations, i, options))
        })
      }

      removeElements = (selector) => {
        this.elements.filter(element => element.selector !== selector)
      }
    }

    return new Lax()
  })()

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = laxInstance;
  else
    window.lax = laxInstance;
})()
