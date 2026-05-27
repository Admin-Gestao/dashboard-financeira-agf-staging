          {
            receita: number;
            objetos: number;
            despesa_total: number;
            despesas: Record<string, number>;
            despesa_subcontas_total?: number;
          }
        >
      >
    > = {};

    const ensure = (ano: number, mes: number, agfNome: string) => {
      const key = normAgfName(agfNome);
      if (!dados[ano]) dados[ano] = {};
      if (!dados[ano][mes]) dados[ano][mes] = {};
      if (!dados[ano][mes][key]) {
        dados[ano][mes][key] = {
          receita: 0,
          objetos: 0,
          despesa_total: 0,
          despesas: Object.fromEntries(categoriasDespesa.map((categoria) => [categoria, 0])),
        };
      }
      return dados[ano][mes][key];
    };

    for (const lm of lmList) {
      const meta = lmIndex.get(lm._id);
      if (!meta) continue;
      if (!meta.ano || !meta.mes) continue;

      const entry = ensure(meta.ano, meta.mes, meta.agfNome);
      entry.receita += Number((lm as any).total_receita || 0);
      entry.despesa_total += Number((lm as any).total_despesa || 0);
    }

    for (const bal of balList) {
      const lmField = (bal as any)["Lançamento Mensal"];
      let ano = 0;
      let mes = 0;
      let agfNome = "AGF";

      if (typeof lmField === "string") {
        const meta = lmIndex.get(lmField);
        if (!meta) continue;
        ano = meta.ano;
        mes = meta.mes;
        agfNome = meta.agfNome;
      } else if (typeof lmField === "object" && lmField) {
        ano = parseAno((lmField as any).Ano);
        mes = parseMes((lmField as any)["Mês"]);
        const agfId = refToId((lmField as any).AGF);
        agfNome = normAgfName(agfIdToNome.get(agfId || "") || agfNome);
      }

      if (!ano || !mes) continue;

      const entry = ensure(ano, mes, agfNome);
      entry.objetos += parseValorBR((bal as any).Quantidade);
    }

    for (const sc of scList) {
      const lmField =
        (sc as any)["LançamentoMesnal"] ??
        (sc as any)["LançamentoMensal"] ??
        (sc as any)["Lançamento Mensal"];

      let ano = 0;
      let mes = 0;
      let agfNome = "AGF";

      if (typeof lmField === "string") {
        const meta = lmIndex.get(lmField);
        if (meta) {
          ano = meta.ano;
          mes = meta.mes;
          agfNome = meta.agfNome;
        } else {
          const parsed = parseMesAnoStr(lmField);
          if (parsed) {
            ano = parsed.ano;
            mes = parsed.mes;
          }
        }
      } else if (typeof lmField === "object" && lmField) {
        ano = parseAno((lmField as any).Ano);
        mes = parseMes((lmField as any)["Mês"]);
        const agfId = refToId((lmField as any).AGF);
        agfNome = normAgfName(agfIdToNome.get(agfId || "") || agfNome);
      }

      if ((sc as any).AGF) {
        const agfId = refToId((sc as any).AGF);
        agfNome = normAgfName(agfIdToNome.get(agfId || "") || agfNome);
      }

      if (!ano || !mes) continue;

      const entry = ensure(ano, mes, agfNome);
      let nomeCategoria = "";
      const categoriaRaw = (sc as any).Categoria;

      if (categoriaRaw) {
        if (typeof categoriaRaw === "string") {
          nomeCategoria = catIdToNome.get(categoriaRaw) || "";
        } else if (typeof categoriaRaw === "object") {
          nomeCategoria =
            (categoriaRaw as any).Categoria ||
            (categoriaRaw as any).Nome ||
            (categoriaRaw as any).name ||
            (categoriaRaw as any).nome ||
            "";
        } else if (typeof categoriaRaw === "number") {
          nomeCategoria = String(categoriaRaw);
        }
      }

      const descricao = (sc as any)["Descrição"] ?? (sc as any).descricao ?? "";
      let categoria = normalizeCategoriaFromMeta(
        nomeCategoria,
        descricao,
        typeof categoriaRaw === "string" ? categoriaRaw : undefined
      );

      if (!categoriasDespesa.includes(categoria)) {
        categoria = "extras";
      }

      const valor = parseValorBR((sc as any).Valor);
      entry.despesas[categoria] = (entry.despesas[categoria] || 0) + valor;
      entry.despesa_subcontas_total = (entry.despesa_subcontas_total || 0) + valor;
    }

    for (const anoStr of Object.keys(dados)) {
      const ano = Number(anoStr);
      for (const mesStr of Object.keys(dados[ano])) {
        const mes = Number(mesStr);
        for (const agfNome of Object.keys(dados[ano][mes])) {
          const item = dados[ano][mes][agfNome];
          item.receita = Number(item.receita || 0);
          item.objetos = Number(item.objetos || 0);
          item.despesa_total = Number(item.despesa_total || 0);
          for (const categoria of categoriasDespesa) {
            item.despesas[categoria] = Number(item.despesas[categoria] || 0);
          }
          item.despesa_subcontas_total = Number(item.despesa_subcontas_total || 0);
        }
      }
    }

    return NextResponse.json({
      agfs,
      categoriasDespesa,
      dados,
    });
  } catch (error: any) {
    console.error("Erro na API:", error);
    return NextResponse.json({ error: error.message || "Erro Interno do Servidor" }, { status: 500 });
  }
}
