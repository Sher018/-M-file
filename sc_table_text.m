function col = sc_table_text(headers, rows, colName)
    % SC_TABLE_TEXT Извлечение текстового столбца по имени (для Element, Point).
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.3.0
    %
    % Возвращает cell-массив строк той же длины, что и число строк данных.
    % Если столбца нет — возвращает пустой cell {}.

    idx = find(strcmpi(strtrim_cell(headers), colName), 1);
    if isempty(idx)
        col = {};
        return;
    end

    rawCol = rows(:, idx);
    col = cell(numel(rawCol), 1);
    for k = 1:numel(rawCol)
        v = rawCol{k};
        if ischar(v)
            col{k} = strtrim(v);
        elseif isnumeric(v) && isscalar(v) && isfinite(v)
            col{k} = strtrim(num2str(v));
        else
            col{k} = '';
        end
    end
end

function out = strtrim_cell(c)
    out = cell(size(c));
    for k = 1:numel(c)
        if ischar(c{k})
            out{k} = strtrim(c{k});
        else
            out{k} = c{k};
        end
    end
end
