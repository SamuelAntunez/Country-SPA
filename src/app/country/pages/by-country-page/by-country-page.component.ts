import { Component, inject, linkedSignal } from '@angular/core';
import { CountrySearchInputComponent } from "../../components/country-dashboard/country-search-input/country-search-input.component";
import { CountryListComponent } from "../../components/country-dashboard/country-list/country-list.component";
import { of } from 'rxjs';
import { CountryService } from '../../services/country.service';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-by-country-page',
  imports: [CountrySearchInputComponent, CountryListComponent],
  templateUrl: './by-country-page.component.html',
})
export class ByCountryPageComponent {


  CountryService = inject(CountryService);


  activatedRoute = inject(ActivatedRoute)
  router = inject(Router)
  queryParam = this.activatedRoute.snapshot.queryParamMap.get('query') ?? '' // fotografia reactiva del momento
  query = linkedSignal(() => this.queryParam)

  countryResource = rxResource({
    params: () => ({ query: this.query() }),
    stream: ({ params }) => {
      if (!params.query) return of([]);
      this.router.navigate(['/country/by-country'], {
        queryParams: {
          query: params.query
        }
      })
      return this.CountryService.searchByCountry(params.query)

    }

  })



}
