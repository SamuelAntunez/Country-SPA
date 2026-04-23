# 🌍 Country App - Guía y Explicación del Código

Esta aplicación es un buscador de países construido con **Angular (v19+)** que se conecta a la API pública de *REST Countries*. Su objetivo principal no es solo mostrar datos, sino poner en práctica conceptos avanzados de Angular como **Signals**, **Lazy Loading**, **Manejo de Estado Reactivo (rxResource)**, **Optimización de Caché** y **Sincronización de Estado con la URL**.

A continuación, se presenta una explicación detallada, bloque por bloque, de cómo funciona la aplicación y cada línea de código fundamental.

---

## 1. Sistema de Rutas y Carga Perezosa (Lazy Loading)

Para que la aplicación sea rápida, las rutas están divididas. Solo se carga el código de la sección "Country" cuando el usuario navega a ella.

### `app.routes.ts` - Carga de Rutas Hijas
```typescript
export const routes: Routes = [
  {
    path: '', // Ruta raíz
    component: HomePageComponent, // Muestra la página de inicio
  },
  {
    path: 'country',
    // Importación perezosa (Lazy Loading) de las rutas de "Country"
    loadChildren: () => import('./country/country.routes').then(m => m.CountryRoutes)
  },
  {
    path: '**', // Cualquier ruta que no exista
    redirectTo: '' // Redirige a la ruta raíz
  }
];
```

### Hash Strategy (Uso de `#` en la URL)
Si necesitas que tus rutas usen un hash (ej. `localhost:4200/#/country/by-capital`) para evitar problemas con servidores que no están configurados para Single Page Applications (SPA), puedes activarlo en el `app.config.ts`:

```typescript
// app.config.ts
provideRouter(routes, withHashLocation()), // Activa el HashLocationStrategy
```
* **Explicación:** `withHashLocation()` le dice a Angular que use la parte del hash de la URL para la navegación. Esto es muy útil cuando despliegas en servidores estáticos como GitHub Pages.

---
* **Explicación:** `loadChildren` toma una función que carga el archivo de rutas solo cuando se necesita. El `.then()` extrae específicamente `CountryRoutes`.

### Simplificando el Lazy Loading (`export default`)
Si en `country.routes.ts` usamos `export default`, podemos omitir el `.then()`:

```typescript
// En country/country.routes.ts
export const CountryRoutes: Routes = [
  { path: '', component: ByCapitalPageComponent }
];
export default CountryRoutes; // ¡Clave para simplificar!
```
* **Explicación:** Al exportar por defecto, Angular puede inferir directamente el arreglo de rutas al usar `import('./country/country.routes')`, haciendo el código más limpio.

---

## 2. Componentes de Estructura (Layouts)

Los Layouts sirven como un molde o plantilla principal que envuelve a otras páginas.

```typescript
// routes.ts
{
  path: '',
  component: CountryLayoutComponent, // El Layout actúa como contenedor
  children: [ // Todas estas rutas se inyectan dentro del Layout
    { path: 'by-capital', component: ByCapitalPageComponent },
    { path: '**', redirectTo: 'by-capital' }
  ]
}
```

```html
<!-- country-layout.component.html -->
<section class="bg-blue-500">
  <router-outlet /> <!-- Aquí se renderizan las páginas hijas (ej. ByCapitalPageComponent) -->
</section>
<h3>Footer del Country Layout</h3>
```
* **Explicación:** `<router-outlet />` es el marcador de posición donde Angular insertará el HTML de los componentes hijos definidos en el arreglo `children`. Esto evita repetir código como el Navbar o el Footer en cada página.

---

## 3. Peticiones HTTP y Servicios

Para hacer peticiones a la API, Angular usa `HttpClient`. En versiones recientes, se configura a nivel de aplicación usando `fetch`.

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch()), // Habilita las peticiones HTTP usando la API Fetch nativa
  ]
};
```

### Inyección de Dependencias (Servicios)
En Angular moderno, en lugar del constructor, se usa la función `inject()`.

```typescript
// country.service.ts
@Injectable({ providedIn: 'root' }) // Disponible en toda la aplicación
export class CountryService {
  private http = inject(HttpClient); // Inyectamos la herramienta para hacer peticiones
}
```

```typescript
// by-capital-page.component.ts
export class ByCapitalPageComponent {
  // Inyectamos nuestro servicio propio para usarlo en el componente
  CountryService = inject(CountryService); 
}
```

---

## 4. Manipulación de Datos (Pipes y Mappers)

La API externa suele devolver mucha información innecesaria o con nombres complejos. Utilizamos un **Mapper** para limpiar esos datos.

```typescript
// Dentro de un método HTTP del servicio
return this.http.get<RESTCountry[]>(url)
  .pipe( // Intercepta el flujo de datos antes de que llegue al componente
    map(restCountries => CountryMapper.mapRestCountryArrayToCountryArray(restCountries))
  );
```
* **Explicación:** `.pipe()` nos permite concatenar operadores RxJS. `map()` toma la respuesta original (`restCountries`) y la transforma usando nuestro Mapper.

### El Mapper (`CountryMapper`)
```typescript
export class CountryMapper {
  static mapRestCountryToCountry(restCountry: RESTCountry): Country {
    return { // Retorna un objeto "Country" limpio solo con lo que necesitamos
      cca2: restCountry.cca2,
      flag: restCountry.flag,
      flagSvg: restCountry.flags.svg,
      name: restCountry.translations['spa'].common ?? restCountry.name.common,
      capital: restCountry.capital.join(','),
      population: restCountry.population
    }
  }
  // Mapea un arreglo completo
  static mapRestCountryArrayToCountryArray(restCountries: RESTCountry[]): Country[] {
    return restCountries.map(this.mapRestCountryToCountry);
  }
}
```

---

## 5. Manejo de Excepciones Clásico y Caché

### En el Servicio (Guardando en Caché)
Usamos un `Map` en memoria para evitar hacer peticiones repetidas a la misma ciudad.

```typescript
// country.service.ts
private queryCacheCapital = new Map<string, Country[]>(); // Almacén de caché

searchByCapital(query: string): Observable<Country[]> {
  query = query.toLowerCase();

  // 1. Verificamos si la búsqueda ya existe en el caché
  if (this.queryCacheCapital.has(query)) {
    return of(this.queryCacheCapital.get(query)!); // Retorna los datos como Observable sin consultar la API
  }

  // 2. Si no está en caché, hacemos la petición
  return this.http.get<RESTCountry[]>(`${API_URL}/capital/${query}`)
    .pipe(
      map(restCountries => CountryMapper.mapRestCountryArrayToCountryArray(restCountries)), // Transformamos datos
      tap(countries => this.queryCacheCapital.set(query, countries)), // Guardamos silenciosamente en el caché
      catchError(error => { // Si la API devuelve un error (ej. 404 No encontrado)
        console.log('Error fetching', error);
        return throwError(() => new Error(`No se pudo obtener paises de: ${query}`));
      })
    );
}
```

### En el Componente (Manejando la Respuesta)
```typescript
this.CountryService.searchByCapital(query)
  .subscribe({
    next: (countries) => { // Todo salió bien
      this.isLoading.set(false); // Ocultar spinner
      this.countries.set(countries); // Guardar los países en el Signal
    },
    error: (err) => { // Hubo un error
      this.isLoading.set(false);
      this.countries.set([]); // Vaciamos la lista
      this.isError.set(err); // Mostramos el mensaje de error
    }
  });
```

---

## 6. Manejo Reactivo Avanzado (rxResource) - Angular 19+

Las versiones recientes de Angular introducen `resource` y `rxResource` para conectar peticiones asíncronas con Signals, eliminando variables booleanas innecesarias como `isLoading`.

```typescript
export class ByCapitalPageComponent {
  CountryService = inject(CountryService);
  query = signal(''); // La palabra que el usuario está buscando

  // rxResource "reacciona" cada vez que 'query' cambia
  countryResource = rxResource({
    params: () => ({ query: this.query() }), // Define los parámetros que observará
    stream: ({ params }) => { // Lo que se ejecutará al cambiar el parámetro
      
      if (!params.query) return of([]); // Si está vacío, retorna arreglo vacío

      // Llama a nuestro servicio y retorna el Observable
      return this.CountryService.searchByCapital(params.query);
    }
  });
}
```
* **Ventaja:** `countryResource` nos provee automáticamente de propiedades como `countryResource.value()`, `countryResource.isLoading()` y `countryResource.error()`, simplificando enormemente el HTML.

---

## 7. Búsquedas Automáticas (Debounce Time)

Queremos que la app busque sola mientras el usuario escribe, pero sin saturar la API. Usamos un "Debounce".

```typescript
// Se ejecuta cada vez que 'this.inputValue()' cambia
debounceEffect = effect((onCleanup) => {
  const value = this.inputValue();

  // 1. Inicia una cuenta regresiva de medio segundo
  const timeout = setTimeout(() => {
    this.value.emit(value); // Emite el valor buscado hacia el componente padre
  }, 500);

  // 2. Si el efecto se vuelve a ejecutar antes de los 500ms...
  onCleanup(() => {
    clearTimeout(timeout); // ¡Cancela el temporizador anterior!
  });
});
```
* **Explicación:** Si el usuario escribe rápidamente "Lim", el temporizador arranca y se cancela 3 veces. Solo cuando deje de escribir por 500ms, se emitirá la palabra y se realizará la búsqueda.

En el HTML:
```html
<input type="text" class="..." 
  (keyup.enter)="value.emit(txtSearch.value)" <!-- Si da Enter, busca de inmediato -->
  (keyup)="inputValue.set(txtSearch.value)" <!-- Actualiza la señal en cada tecla presionada -->
>
```

---

## 8. Preservar Estado en la URL y Leerlo

Al recargar la página, queremos mantener la última búsqueda. Usamos `ActivatedRoute` y el Router.

### 1. Leer la URL al Cargar el Componente
```typescript
activatedRoute = inject(ActivatedRoute); // Nos permite leer la URL actual

// snapshot: toma una "foto" del momento exacto de carga
// queryParamMap.get('query'): obtiene el valor después de "?query=" (Ej: ?query=lima)
queryParam = this.activatedRoute.snapshot.queryParamMap.get('query') ?? ''; 

query = signal(this.queryParam); // Inicia la señal con el valor de la URL
```

### 2. Enlazar el Input con un LinkedSignal (Angular 19+)
Un `linkedSignal` permite tener un estado derivado que puede mutar independientemente, pero que se reinicia si su fuente cambia.
```typescript
initialValue = input<string>(''); // Valor de entrada del componente (viene desde la URL)
value = output<string>(); // Emisor de eventos hacia el exterior

// Enlaza el valor inicial, pero permite que el usuario lo modifique internamente al escribir
inputValue = linkedSignal<string>(() => this.initialValue()); 
```

### 3. Actualizar la URL automáticamente
Volviendo a nuestro `rxResource`, podemos decirle que modifique la URL en cada búsqueda.
```typescript
router = inject(Router); // Servicio para navegación

countryResource = rxResource({
  params: () => ({ query: this.query() }),
  stream: ({ params }) => {
    if (!params.query) return of([]);

    // Actualizamos la URL (ej. cambia a /country/by-capital?query=lima)
    this.router.navigate(['/country/by-capital'], {
      queryParams: { query: params.query } 
    });

    return this.CountryService.searchByCapital(params.query);
  }
});
```

---

## Dependencias de Estilos
La interfaz de usuario ha sido construida y embellecida usando:
* **[DaisyUI](https://daisyui.com/)**: Biblioteca de componentes para Tailwind CSS.
* **[Iconify](https://iconify.design/)**: Para el manejo de íconos vectoriales dinámicos.
