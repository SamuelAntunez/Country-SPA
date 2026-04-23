import { Component, effect, input, linkedSignal, output, signal } from '@angular/core';

@Component({
  selector: 'app-country-search-input',
  imports: [],
  templateUrl: './country-search-input.component.html',
})
export class CountrySearchInputComponent {
  placeholder = input('Buscar')
  debounce = input(1000)

  initialValue = input<string>('')

  value = output<string>()
  inputValue = linkedSignal<string>(() => this.initialValue())

  debounceEffect = effect((onCleanup) => {
    const value = this.inputValue();

    const timeout = setTimeout(() => {
      this.value.emit(value)
    }, this.debounce());

    onCleanup(() => {
      clearTimeout(timeout)
    })
  })
}
