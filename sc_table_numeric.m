function col = sc_table_numeric(headers, rows, colName, optional)
    % SC_TABLE_NUMERIC Извлечение числового столбца по имени из результата sc_read_table.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.3.0
    %
    % col = sc_table_numeric(headers, rows, colName)            — обязательный;
    % col = sc_table_numeric(headers, rows, colName, true)      — необязательный ([] если нет).

    if nargin < 4
        optional = false;
    end

    idx = find(strcmpi(strtrim_cell(headers), colName), 1);
    if isempty(idx)
        if optional
            col = [];
            return;
        end
        error('SC:MissingColumn', 'sc_table_numeric: в таблице нет столбца "%s".', colName);
    end

    rawCol = rows(:, idx);
    nRows = numel(rawCol);
    emptyMask = false(nRows, 1);
    for k = 1:nRows
        v = rawCol{k};
        emptyMask(k) = isempty(v) || (ischar(v) && isempty(strtrim(v)));
    end

    if all(emptyMask)
        if optional
            col = [];
            return;
        end
        error('SC:BadValue', 'sc_table_numeric: столбец "%s" не содержит значений.', colName);
    end
    if any(emptyMask)
        firstEmpty = find(emptyMask, 1);
        error('SC:BadValue', ...
            'sc_table_numeric: пустое значение в столбце "%s", строка данных %d.', colName, firstEmpty);
    end

    col = zeros(nRows, 1);
    for k = 1:nRows
        v = rawCol{k};
        if isnumeric(v) && isscalar(v)
            col(k) = v;
        elseif ischar(v)
            num = str2double(strrep(strtrim(v), ',', '.'));
            if isnan(num)
                error('SC:BadValue', ...
                    'sc_table_numeric: нечисловое значение "%s" в столбце "%s", строка данных %d.', ...
                    v, colName, k);
            end
            col(k) = num;
        else
            error('SC:BadValue', ...
                'sc_table_numeric: неподдерживаемый тип в столбце "%s", строка данных %d.', colName, k);
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
