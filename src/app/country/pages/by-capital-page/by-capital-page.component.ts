import { Component, inject, linkedSignal } from '@angular/core';
import { CountrySearchInputComponent } from "../../components/country-dashboard/country-search-input/country-search-input.component";
import { CountryListComponent } from "../../components/country-dashboard/country-list/country-list.component";
import { rxResource } from '@angular/core/rxjs-interop'
import { CountryService } from '../../services/country.service';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-by-capital-page',
  imports: [CountrySearchInputComponent, CountryListComponent],
  templateUrl: './by-capital-page.component.html',
})
export class ByCapitalPageComponent {

  CountryService = inject(CountryService)

  activatedRoute = inject(ActivatedRoute)
  router = inject(Router)

  queryParam = this.activatedRoute.snapshot.queryParamMap.get('query') ?? '' // fotografia reactiva del momento

  query = linkedSignal(() => this.queryParam)

  countryResource = rxResource({
    params: () => ({ query: this.query() }),
    stream: ({ params }) => {


      if (!params.query) return of([])

      this.router.navigate(['/country/by-capital'], {
        queryParams: {
          query: params.query
        }
      })

      return this.CountryService.searchByCapital(params.query)
    }
  })


}
