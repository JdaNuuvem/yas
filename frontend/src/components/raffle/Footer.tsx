export function Footer() {
  return (
    <footer className="px-5 py-8 space-y-5 border-t border-gray-100">
      {/* Age rating */}
      <div className="flex items-center justify-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center">
          <span className="text-white text-xs font-black">18+</span>
        </div>
        <span className="text-gray-400 text-xs">
          Permitido para maiores de 18 anos
        </span>
      </div>

      {/* Legal text */}
      <p className="text-gray-300 text-[10px] text-center leading-relaxed">
        Sorteio pela Loteria Federal. Ao participar você concorda com os termos
        de uso e regulamento da promoção. É proibida a venda para menores de 18
        anos. Os prêmios serão entregues de acordo com os critérios
        estabelecidos neste site.
      </p>

      <p className="text-gray-300 text-[10px] text-center">
        {new Date().getFullYear()} - Todos os direitos reservados
      </p>
    </footer>
  );
}
