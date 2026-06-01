function points = func_import_points(filename)
    % FUNC_IMPORT_POINTS Импорт параметров сети с группировкой по точкам КЗ.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.4.0
    % Подраздел диплома: 3.2 «Модуль импорта исходных данных»
    %
    % Если есть столбец Point, строки группируются по его значению — каждая
    % группа образует отдельную точку КЗ. Внутри точки ветви объединяются по
    % столбцу Parallel (параллельно внутри группы, затем последовательно).
    % Если столбца Point нет — одна точка (как func_import_data).
    %
    % Необязательно: c (коэффициент напряжения, E = c, по умолчанию 1.1),
    % Rf (переходное сопротивление, Ом, по умолчанию 0) — берётся первое
    % значение в пределах точки.
    %
    % points — структурный массив с полями:
    %   name, Z1, Z2, Z0, E, U_nom, scInfo (Z_base, inputFile, z2_from_excel,
    %   nElements, c, Rf_ohm, Rf_pu).

    if nargin < 1
        filename = 'network_parameters.xlsx';
    end

    [~, fn, ext] = fileparts(filename);
    inputFile = [fn ext];

    [headers, rows] = sc_read_table(filename);

    pointCol = sc_table_text(headers, rows, 'Point');
    parLab = sc_table_text(headers, rows, 'Parallel');
    R1 = sc_table_numeric(headers, rows, 'R1', false);
    X1 = sc_table_numeric(headers, rows, 'X1', false);
    R0 = sc_table_numeric(headers, rows, 'R0', false);
    X0 = sc_table_numeric(headers, rows, 'X0', false);
    Un = sc_table_numeric(headers, rows, 'U_nom', false);
    R2 = sc_table_numeric(headers, rows, 'R2', true);
    X2 = sc_table_numeric(headers, rows, 'X2', true);
    cCol = sc_table_numeric(headers, rows, 'c', true);
    RfCol = sc_table_numeric(headers, rows, 'Rf', true);

    nRows = numel(R1);
    if isempty(pointCol)
        groupKeys = {'1'};
        groupIdx = {1:nRows};
    else
        [groupKeys, groupIdx] = group_by(pointCol);
    end

    hasZ2 = ~isempty(R2) && ~isempty(X2);

    points = struct('name', {}, 'Z1', {}, 'Z2', {}, 'Z0', {}, ...
        'E', {}, 'U_nom', {}, 'scInfo', {});

    for g = 1:numel(groupKeys)
        idx = groupIdx{g};
        U_nom = Un(idx(1));
        if ~(isfinite(U_nom) && U_nom > 0)
            error('func_import_points: U_nom должно быть положительным (точка %s).', groupKeys{g});
        end
        Z_base = (U_nom^2) / 100;

        labG = sub_labels(parLab, idx);
        Z1 = sc_series_parallel((R1(idx) + 1j * X1(idx)), labG) / Z_base;
        Z0 = sc_series_parallel((R0(idx) + 1j * X0(idx)), labG) / Z_base;
        if hasZ2
            Z2 = sc_series_parallel((R2(idx) + 1j * X2(idx)), labG) / Z_base;
            z2flag = true;
        else
            Z2 = Z1;
            z2flag = false;
        end

        cVal = 1.1;
        if ~isempty(cCol)
            cVal = cCol(idx(1));
        end
        RfVal = 0;
        if ~isempty(RfCol)
            RfVal = RfCol(idx(1));
        end

        scInfo = struct('Z_base', Z_base, 'inputFile', inputFile, ...
            'z2_from_excel', z2flag, 'nElements', numel(idx), ...
            'c', cVal, 'Rf_ohm', RfVal, 'Rf_pu', RfVal / Z_base);

        p.name = sprintf('Точка %s', groupKeys{g});
        p.Z1 = Z1;
        p.Z2 = Z2;
        p.Z0 = Z0;
        p.E = cVal;
        p.U_nom = U_nom;
        p.scInfo = scInfo;
        points(g) = p; %#ok<AGROW>
    end

    fprintf('  Загружено точек КЗ: %d (элементов всего: %d)\n', numel(points), nRows);
end

function labG = sub_labels(parLab, idx)
    if isempty(parLab)
        labG = {};
        return;
    end
    labG = parLab(idx);
end

function [keys, idxGroups] = group_by(labels)
    keys = {};
    idxGroups = {};
    for k = 1:numel(labels)
        lab = labels{k};
        if isempty(lab)
            lab = '1';
        end
        pos = find(strcmp(keys, lab), 1);
        if isempty(pos)
            keys{end + 1} = lab; %#ok<AGROW>
            idxGroups{end + 1} = k; %#ok<AGROW>
        else
            idxGroups{pos} = [idxGroups{pos}, k];
        end
    end
end
