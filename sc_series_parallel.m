function Ztot = sc_series_parallel(Zvec, groupLabels)
    % SC_SERIES_PARALLEL Эквивалентное сопротивление ветвей: параллель внутри группы, затем последовательно.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.4.0
    % Подраздел диплома: 3.2 «Модуль импорта исходных данных»
    %
    % Zvec        — вектор комплексных сопротивлений ветвей (Ом или о.е.);
    % groupLabels — cell-массив меток (столбец Parallel). Ветви с одинаковой
    %               непустой меткой соединяются параллельно; полученные
    %               эквиваленты и ветви без метки суммируются последовательно.
    %
    % Если groupLabels пуст или все метки пусты — чистое последовательное
    % суммирование (обратная совместимость).

    Zvec = Zvec(:);
    n = numel(Zvec);

    if nargin < 2 || isempty(groupLabels)
        Ztot = sum(Zvec);
        return;
    end

    labels = cell(n, 1);
    for k = 1:n
        if k <= numel(groupLabels) && ischar(groupLabels{k})
            labels{k} = strtrim(groupLabels{k});
        else
            labels{k} = '';
        end
    end

    Ztot = 0;
    usedGroups = {};
    for k = 1:n
        lab = labels{k};
        if isempty(lab)
            Ztot = Ztot + Zvec(k);
        elseif ~any(strcmp(usedGroups, lab))
            usedGroups{end + 1} = lab; %#ok<AGROW>
            idx = strcmp(labels, lab);
            Ztot = Ztot + parallel_combine(Zvec(idx));
        end
    end
end

function Zp = parallel_combine(Zs)
    Zs = Zs(:);
    if any(Zs == 0)
        Zp = 0;
        return;
    end
    Zp = 1 / sum(1 ./ Zs);
end
